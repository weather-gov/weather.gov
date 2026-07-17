package internal

import (
	"os"
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
