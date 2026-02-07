package data

import (
	"os"
	"testing"
)

func TestGetDatabaseConnectionInfo(t *testing.T) {
	// Test local defaults
	os.Clearenv()
	config := GetDatabaseConnectionInfo()

	if config.User != "drupal" {
		t.Errorf("expected user drupal, got %s", config.User)
	}
	if config.Host != "database" {
		t.Errorf("expected host database, got %s", config.Host)
	}

	// Test env override
	os.Setenv("DB_HOST", "localhost")
	config = GetDatabaseConnectionInfo()
	if config.Host != "localhost" {
		t.Errorf("expected host localhost, got %s", config.Host)
	}

	// Test Production VCAP (simplified)
	os.Setenv("API_INTEROP_PRODUCTION", "true")
	vcapJSON := `{
		"aws-rds": [{
			"credentials": {
				"username": "prod_user",
				"password": "prod_password",
				"name": "prod_db",
				"host": "prod_host",
				"port": 5432
			}
		}]
	}`
	os.Setenv("VCAP_SERVICES", vcapJSON)

	config = GetDatabaseConnectionInfo()
	if config.User != "prod_user" {
		t.Errorf("expected user prod_user, got %s", config.User)
	}
	if config.SSL != true {
		t.Errorf("expected SSL true in prod")
	}
}
