package internal

import (
	"fmt"
	"strconv"

	"github.com/cloudfoundry-community/go-cfenv"
)

func IsRunningOnCF() bool {
	return cfenv.IsRunningOnCF()
}

func GetCFDatabaseCredentials() (DatabaseCredentials, error) {
	appEnv, err := cfenv.Current()
	if err != nil {
		return DatabaseCredentials{}, fmt.Errorf("not in a cloud.gov environment: %w", err)
	}
	rds, err := appEnv.Services.WithLabel("aws-rds")
	if err != nil {
		return DatabaseCredentials{}, fmt.Errorf("cloud.gov rds service not bound: %w", err)
	}
	creds := rds[0].Credentials
	port, err := strconv.Atoi(creds["port"].(string))
	if err != nil {
		return DatabaseCredentials{}, fmt.Errorf("cloud.gov rds port not an integer: %w", err)
	}
	return DatabaseCredentials{
		Name:     creds["db_name"].(string),
		User:     creds["username"].(string),
		Password: creds["password"].(string),
		Host:     creds["host"].(string),
		Port:     int(port),
	}, nil
}
