package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var DBPool *pgxpool.Pool

func SetupDatabase() {
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	name := os.Getenv("DB_NAME")
	if host == "" {
		host = "database"
	}
	if user == "" {
		user = "postgres"
	}
	if name == "" {
		name = "weathergov"
	}

	dsn := fmt.Sprintf("postgres://%s:%s@%s:5432/%s", user, pass, host, name)

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		log.Fatalf("Unable to parse DB config: %v", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}

	DBPool = pool
	log.Printf("Connected to Postgres at %s", host)
}
