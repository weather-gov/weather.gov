package weather

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestFetch(t *testing.T) {
	// Setup Redis Mock
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Could not start miniredis: %v", err)
	}
	defer mr.Close()

	rClient := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
	SetRedisClient(rClient) // Inject mock client

	// Mock Sleep
	var sleepCalls []time.Duration
	SleepFunc = func(d time.Duration) {
		sleepCalls = append(sleepCalls, d)
	}
	defer func() { SleepFunc = time.Sleep }() // Restore

	// Helper struct for server responses
	type ResponseConfig struct {
		Status int
		Body   string
		Header map[string]string
	}

	setupServer := func(responses ...ResponseConfig) *httptest.Server {
		callCount := 0
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if callCount >= len(responses) {
				// Default to last response or 500
				w.WriteHeader(500)
				return
			}
			cfg := responses[callCount]
			callCount++

			for k, v := range cfg.Header {
				w.Header().Set(k, v)
			}
			w.WriteHeader(cfg.Status)
			w.Write([]byte(cfg.Body))
		}))
	}

	t.Run("succeeds on first attempt", func(t *testing.T) {
		sleepCalls = nil
		server := setupServer(ResponseConfig{Status: 200, Body: `{"result":"success"}`})
		defer server.Close()
		BaseURL = server.URL

		res, err := FetchAPIJson("/path")
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		resMap := res.(map[string]interface{})
		if resMap["result"] != "success" {
			t.Errorf("Expected success, got %v", res)
		}
		if len(sleepCalls) != 0 {
			t.Errorf("Expected 0 sleeps, got %d", len(sleepCalls))
		}
	})

	t.Run("fails once and then succeeds", func(t *testing.T) {
		sleepCalls = nil
		server := setupServer(
			ResponseConfig{Status: 500, Body: `{"error":"fail"}`},
			ResponseConfig{Status: 200, Body: `{"result":"success"}`},
		)
		defer server.Close()
		BaseURL = server.URL

		res, err := FetchAPIJson("/path")
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		resMap := res.(map[string]interface{})
		if resMap["result"] != "success" {
			t.Errorf("Expected success, got %v", res)
		}
		if len(sleepCalls) != 1 {
			t.Errorf("Expected 1 sleep, got %d", len(sleepCalls))
		}
		if sleepCalls[0] != 75*time.Millisecond {
			t.Errorf("Expected 75ms sleep, got %v", sleepCalls[0])
		}
	})

	t.Run("fails 4 times then succeeds", func(t *testing.T) {
		sleepCalls = nil
		server := setupServer(
			ResponseConfig{Status: 503, Body: "{}"},
			ResponseConfig{Status: 503, Body: "{}"},
			ResponseConfig{Status: 503, Body: "{}"},
			ResponseConfig{Status: 503, Body: "{}"},
			ResponseConfig{Status: 200, Body: `{"result":"success"}`},
		)
		defer server.Close()
		BaseURL = server.URL

		res, err := FetchAPIJson("/path")
		if err != nil {
			t.Errorf("Unexpected error: %v", err)
		}

		resMap := res.(map[string]interface{})
		if resMap["result"] != "success" {
			t.Errorf("Expected success, got %v", res)
		}

		expectedDelays := []time.Duration{
			75 * time.Millisecond,
			124 * time.Millisecond,
			204 * time.Millisecond,
			337 * time.Millisecond,
		}

		if len(sleepCalls) != 4 {
			t.Fatalf("Expected 4 sleeps, got %d", len(sleepCalls))
		}
		for i, d := range expectedDelays {
			if sleepCalls[i] != d {
				t.Errorf("Sleep %d: expected %v, got %v", i, d, sleepCalls[i])
			}
		}
	})

	t.Run("fails 5 times and gives up", func(t *testing.T) {
		sleepCalls = nil
		server := setupServer(
			ResponseConfig{Status: 500, Body: `{"msg":"fail"}`},
			ResponseConfig{Status: 500, Body: `{"msg":"fail"}`},
			ResponseConfig{Status: 500, Body: `{"msg":"fail"}`},
			ResponseConfig{Status: 500, Body: `{"msg":"fail"}`},
			ResponseConfig{Status: 500, Body: `{"msg":"fail"}`},
		)
		defer server.Close()
		BaseURL = server.URL

		res, _ := FetchAPIJson("/path")
		// Should return the error response from last attempt
		resMap := res.(map[string]interface{})
		if resMap["error"] != true {
			t.Errorf("Expected error: true, got %v", resMap)
		}
		if resMap["msg"] != "fail" {
			t.Errorf("Expected msg: fail, got %v", resMap)
		}

		if len(sleepCalls) != 4 { // 4 retries for 5 attempts
			t.Errorf("Expected 4 sleeps, got %d", len(sleepCalls))
		}
	})

	t.Run("does not retry on 4xx", func(t *testing.T) {
		sleepCalls = nil
		server := setupServer(
			ResponseConfig{Status: 404, Body: `{"msg":"not found"}`},
		)
		defer server.Close()
		BaseURL = server.URL

		res, _ := FetchAPIJson("/path")
		resMap := res.(map[string]interface{})

		if resMap["error"] != true {
			t.Errorf("Expected error: true")
		}
		if resMap["status"] != 404 {
			t.Errorf("Expected status 404, got %v", resMap["status"])
		}
		if len(sleepCalls) != 0 {
			t.Errorf("Expected 0 sleeps, got %d", len(sleepCalls))
		}
	})

	t.Run("handles invalid JSON", func(t *testing.T) {
		sleepCalls = nil
		server := setupServer(
			ResponseConfig{Status: 200, Body: `<html>Not JSON</html>`},
		)
		defer server.Close()
		BaseURL = server.URL

		res, _ := FetchAPIJson("/path")
		resMap := res.(map[string]interface{})

		if resMap["error"] != true {
			t.Errorf("Expected error: true")
		}
		if resMap["message"] != "invalid JSON" {
			t.Errorf("Expected messge 'invalid JSON', got %v", resMap["message"])
		}
	})

	t.Run("uses Redis cache", func(t *testing.T) {
		sleepCalls = nil
		// Pre-populate Redis
		jsonStr := `{"cached":true}`
		rClient.Set(ctx, "/cached-path", jsonStr, 10*time.Second)

		// Server should NOT be called
		server := setupServer() // No responses defined, would 500 if called
		defer server.Close()
		BaseURL = server.URL // Not strictly needed if cached, but for safety

		// Note: The key in fetch.go uses u.Path
		// If we set BaseURL to server.URL, it might affect parsing?
		// internalFetch joins BaseURL+path.
		// If path is "/cached-path", valid.
		// Key used in GetFromRedis is u.Path => "/cached-path"

		res, err := FetchAPIJson("/cached-path")
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		resMap := res.(map[string]interface{})
		if resMap["cached"] != true {
			t.Errorf("Expected cached response, got %v", res)
		}
	})

	t.Run("saves to Redis with TTL", func(t *testing.T) {
		mr.FlushAll()
		sleepCalls = nil

		server := setupServer(
			ResponseConfig{
				Status: 200,
				Body:   `{"data":"fresh"}`,
				Header: map[string]string{"Cache-Control": "public, s-maxage=60"},
			},
		)
		defer server.Close()
		BaseURL = server.URL

		_, err := FetchAPIJson("/fresh-path")
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		// Check Redis
		val, err := rClient.Get(ctx, "/fresh-path").Result()
		if err != nil {
			t.Fatalf("Redis key not found: %v", err)
		}
		if val != `{"data":"fresh"}` {
			t.Errorf("Unexpected cached value: %s", val)
		}

		ttl := mr.TTL("/fresh-path")
		if ttl != 60*time.Second {
			t.Errorf("Expected TTL 60s, got %v", ttl)
		}
	})
}
