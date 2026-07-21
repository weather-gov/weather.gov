package internal

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DatabaseCredentials struct {
	Name     string
	User     string
	Password string
	Host     string
	Port     int
}

func GetDatabaseCredentials() (DatabaseCredentials, error) {
	if IsRunningOnCF() {
		return GetCFDatabaseCredentials()
	}
	return DatabaseCredentials{
		Name:     os.Getenv("POSTGRES_DB"),
		User:     os.Getenv("POSTGRES_USER"),
		Password: os.Getenv("POSTGRES_PASSWORD"),
		Host:     "database",
		Port:     5432,
	}, nil
}

func NewDBPool(ctx context.Context) (*pgxpool.Pool, error) {
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		connString = fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s",
			envOrDefault("DB_USERNAME", "drupal"),
			envOrDefault("DB_PASSWORD", "drupal"),
			envOrDefault("DB_HOST", "database"),
			envOrDefault("DB_PORT", "5432"),
			envOrDefault("DB_NAME", "weathergov"),
		)
	}

	pool, err := pgxpool.New(ctx, connString)
	if err != nil {
		return nil, fmt.Errorf("opening db pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("pinging db: %w", err)
	}

	return pool, nil
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
