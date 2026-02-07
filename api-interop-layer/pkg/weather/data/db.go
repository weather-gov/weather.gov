package data

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	_ "github.com/lib/pq"
)

var (
	dbInstance *sql.DB
	once       sync.Once
	dbMutex    sync.Mutex
)

// DBConfig holds the database connection configuration
type DBConfig struct {
	User     string
	Password string
	Database string
	Host     string
	Port     interface{} // can be string or int
	SSL      bool
}

// GetDatabaseConnectionInfo retrieves DB config from env vars
func GetDatabaseConnectionInfo() DBConfig {
	if os.Getenv("API_INTEROP_PRODUCTION") != "" {
		vcapStr := os.Getenv("VCAP_SERVICES")
		if vcapStr != "" {
			var vcap map[string][]struct {
				Credentials struct {
					Username string `json:"username"`
					Password string `json:"password"`
					Name     string `json:"name"`
					Host     string `json:"host"`
					Port     int    `json:"port"`
				} `json:"credentials"`
			}

			if err := json.Unmarshal([]byte(vcapStr), &vcap); err == nil {
				if len(vcap["aws-rds"]) > 0 {
					creds := vcap["aws-rds"][0].Credentials
					return DBConfig{
						User:     creds.Username,
						Password: creds.Password,
						Database: creds.Name,
						Host:     creds.Host,
						Port:     creds.Port,
						SSL:      true,
					}
				}
			}
		}
	}

	// Local defaults
	return DBConfig{
		User:     getEnv("DB_USERNAME", "drupal"),
		Password: getEnv("DB_PASSWORD", "drupal"),
		Database: getEnv("DB_NAME", "weathergov"),
		Host:     getEnv("DB_HOST", "database"),
		Port:     getEnv("DB_PORT", "5432"),
		SSL:      false,
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// GetDBConnection returns a singleton database connection pool
func GetDBConnection() (*sql.DB, error) {
	dbMutex.Lock()
	defer dbMutex.Unlock()

	if dbInstance != nil {
		return dbInstance, nil
	}

	config := GetDatabaseConnectionInfo()
	connStr := fmt.Sprintf("host=%s port=%v user=%s password=%s dbname=%s sslmode=disable",
		config.Host, config.Port, config.User, config.Password, config.Database)

	if config.SSL {
		connStr = fmt.Sprintf("host=%s port=%v user=%s password=%s dbname=%s",
			config.Host, config.Port, config.User, config.Password, config.Database)
	}

	var db *sql.DB
	var err error

	// Retry logic: 0s, 5s, 9s, 16s delays (approximate matching TS)
	backoffs := []time.Duration{0, 5 * time.Second, 9 * time.Second, 16 * time.Second}

	for _, delay := range backoffs {
		if delay > 0 {
			time.Sleep(delay)
		}

		db, err = sql.Open("postgres", connStr)
		if err != nil {
			log.Printf("Failed to open DB driver: %v", err)
			continue
		}

		if err = db.Ping(); err == nil {
			break
		}

		log.Printf("Failed to ping DB: %v", err)
		db.Close()
		db = nil
	}

	if db == nil {
		return nil, fmt.Errorf("failed to connect to database after retries: %v", err)
	}

	dbInstance = db

	// Handle cleanup
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-c
		Cleanup()
		os.Exit(0)
	}()

	return dbInstance, nil
}

// Cleanup closes the database connection
func Cleanup() {
	if dbInstance != nil {
		dbInstance.Close()
	}
}
