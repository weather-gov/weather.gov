package weather

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	ctx         = context.Background()
	UseRedis    = false
	redisClient *redis.Client
)

// InitializeRedis attempts to connect to Redis based on env vars
func InitializeRedis() {
	if redisClient != nil {
		return
	}

	var opts *redis.Options

	if os.Getenv("API_INTEROP_PRODUCTION") != "" {
		UseRedis = true
		log.Println("interop is using redis for cache in prod")

		vcapStr := os.Getenv("VCAP_SERVICES")
		if vcapStr != "" {
			var vcap map[string][]struct {
				Credentials struct {
					Password string `json:"password"`
					Host     string `json:"host"`
					Port     int    `json:"port"`
				} `json:"credentials"`
			}

			if err := json.Unmarshal([]byte(vcapStr), &vcap); err == nil {
				if len(vcap["aws-elasticache-redis"]) > 0 {
					creds := vcap["aws-elasticache-redis"][0].Credentials
					opts = &redis.Options{
						Addr:      fmt.Sprintf("%s:%d", creds.Host, creds.Port),
						Password:  creds.Password,
						TLSConfig: &tls.Config{},
					}
					// If protocol is rediss, we need TLS
					// Simplified for now assuming standard setup
				}
			}
		}
	} else {
		host := os.Getenv("REDIS_HOST")
		port := os.Getenv("REDIS_PORT")
		pass := os.Getenv("REDIS_PASSWORD")

		if host != "" && port != "" {
			UseRedis = true
			log.Println("interop is using redis for cache in dev")
			opts = &redis.Options{
				Addr:     fmt.Sprintf("%s:%s", host, port),
				Password: pass,
			}
		} else {
			log.Println("redis is disabled for cache")
		}
	}

	if opts != nil {
		redisClient = redis.NewClient(opts)
	}
}

// GetFromRedis retrieves a value
func GetFromRedis(key string) (string, error) {
	if !UseRedis || redisClient == nil {
		return "", nil // treat as miss
	}
	val, err := redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", nil // cache miss
	}
	return val, err
}

// SaveToRedis saves a value with TTL
func SaveToRedis(key string, value string, ttlSeconds int) error {
	if !UseRedis || redisClient == nil {
		return nil
	}
	return redisClient.Set(ctx, key, value, time.Duration(ttlSeconds)*time.Second).Err()
}

// GetTTLFromResponse extracts s-maxage from Cache-Control header
func GetTTLFromResponse(header http.Header) int {
	cacheHeader := header.Get("Cache-Control")
	if cacheHeader == "" {
		return 0
	}

	re := regexp.MustCompile(`s-maxage=([0-9]+)`)
	matches := re.FindStringSubmatch(cacheHeader)
	if len(matches) < 2 {
		return 0
	}

	ttl, _ := strconv.Atoi(matches[1])
	return ttl
}

// SetRedisClient allows injecting a client (for testing with miniredis)
func SetRedisClient(client *redis.Client) {
	redisClient = client
	UseRedis = client != nil
}
