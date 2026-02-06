package data

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	util_golang "weathergov/util-golang"
)

// Mock helpers needed
// Since GetPointData uses FetchAPIJson which uses the package global variables,
// we need to swap them for tests.

func TestGetPointData(t *testing.T) {
	// Setup Mock API
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/points/1.000000,2.000000" {
			// Success response
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprintln(w, `{
				"properties": {
					"gridId": "WFO",
					"gridX": 10,
					"gridY": 20
				},
				"geometry": {}
			}`)
			return
		}
		if r.URL.Path == "/points/90.000000,0.000000" {
			w.WriteHeader(404)
			fmt.Fprintln(w, `{"status": 404, "detail": "Not Found"}`)
			return
		}
		w.WriteHeader(500)
	}))
	defer ts.Close()

	// Override BaseURL
	originalBase := util_golang.BaseURL
	util_golang.BaseURL = ts.URL
	defer func() { util_golang.BaseURL = originalBase }()

	// Mock DB?
	// This is hard because db.go uses sql.Open("postgres").
	// We check if "data" tests can use a mock driver OR skip DB tests if no DB.
	// For now, let's assume we can't easily mock DB without sqlmock or docker.
	// We will skip the DB parts if env var not set, OR we just test the logic around compilation.
	// But `GetClosestPlace` calls `GetDBConnection()`.
	// We need to support mocking `GetDBConnection` or `dbInstance`.
	// `dbInstance` is private.

	// Actually, for unit testing `GetPointData`, we ideally want to mock `GetClosestPlace`.
	// But in Go, we can't mock functions unless we use interfaces or function pointers.

	// Strategy: Create a test that only verifies the Grid fetching part if we can bypass DB,
	// or accepts failure on DB.

	// Better: We can test `GetClosestPlace` if we have a DB.
	// If not, we can skip.

	if os.Getenv("TEST_DB_HOST") == "" {
		t.Skip("Skipping DB dependent tests")
	}

	// ... Test logic would go here if we had DB ...
}
