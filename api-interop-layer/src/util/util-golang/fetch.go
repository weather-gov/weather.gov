package util_golang

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

var (
	BaseURL     = "https://api.weather.gov"
	BaseGhwoURL = "https://www.weather.gov"
	HTTPClient  = &http.Client{Timeout: 10 * time.Second} // Default client
	// Hook for sleeping in tests
	SleepFunc = time.Sleep
)

func init() {
	if v := os.Getenv("API_URL"); v != "" {
		BaseURL = v
	}
	if v := os.Getenv("GHWO_URL"); v != "" {
		BaseGhwoURL = v
	}
}

type FetchError struct {
	Status   int
	Response interface{}
	Err      error
}

func (e *FetchError) Error() string {
	return fmt.Sprintf("fetch error: status %d", e.Status)
}

// InternalFetch mirrors the internalFetch logic with retry support handling in the public wrapper
func internalFetch(path string) (interface{}, error) {
	targetURL := path
	if !strings.HasPrefix(path, "http") {
		// Handle relative path: join with BaseURL
		// JS: new URL(path, BASE_URL)
		// Go simple join
		u, _ := url.Parse(BaseURL)
		u.Path, _ = url.JoinPath(u.Path, path)
		// Note: url.JoinPath added in Go 1.19. user's go.mod says 1.21.
		targetURL = u.String()
	}

	u, err := url.Parse(targetURL)
	if err != nil {
		return nil, err
	}

	isGHWO := u.Hostname() == "www.weather.gov" && strings.HasPrefix(u.Path, "/source/")
	isAlert := strings.Contains(u.Path, "alerts")

	if isGHWO {
		// Switch to GHWO Base URL logic
		// JS: url = new URL(url.pathname, BASE_GHWO_URL);
		ghwo, _ := url.Parse(BaseGhwoURL)
		ghwo.Path = u.Path
		u = ghwo
	}

	// Redis Cache Check
	if UseRedis && !isGHWO && !isAlert {
		cached, err := GetFromRedis(u.Path)
		if err == nil && cached != "" {
			var result interface{}
			if err := json.Unmarshal([]byte(cached), &result); err == nil {
				return result, nil
			}
		}
	}

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return nil, err
	}

	// Headers
	if apiKey := os.Getenv("API_KEY"); apiKey != "" {
		req.Header.Set("API-Key", apiKey)
	}
	// wx-host logic from JS
	originalU, _ := url.Parse(targetURL)
	if originalU.Host != "" {
		req.Header.Set("wx-host", originalU.Host)
	}

	resp, err := HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// 200-299 Success
	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		// Cache Logic
		if UseRedis && !isGHWO && !isAlert {
			ttl := GetTTLFromResponse(resp.Header)
			if ttl > 0 {
				SaveToRedis(u.Path, string(bodyBytes), ttl)
			}
		}

		var result interface{}
		if err := json.Unmarshal(bodyBytes, &result); err != nil {
			// JS catches SyntaxError and returns { ...e.cause, error: true }
			// Here we return simple error object
			log.Printf("json parse error: %v", err)
			return map[string]interface{}{"error": true, "message": "invalid JSON"}, nil
		}
		return result, nil
	}

	// Error handling
	var responseData interface{}
	// Try to parse error body as JSON
	_ = json.Unmarshal(bodyBytes, &responseData)

	// Return error for 5xx to trigger retry
	if resp.StatusCode >= 500 {
		return nil, &FetchError{Status: resp.StatusCode, Response: responseData}
	}

	// 4xx returns error object but success (no retry)
	if respMap, ok := responseData.(map[string]interface{}); ok {
		respMap["error"] = true
		respMap["status"] = resp.StatusCode
		return respMap, nil
	}

	// Fallback
	return map[string]interface{}{
		"error":  true,
		"status": resp.StatusCode,
	}, nil

}

// FetchAPIJson fetches JSON from API with retries
func FetchAPIJson(path string) (interface{}, error) {
	delays := []time.Duration{
		75 * time.Millisecond,
		124 * time.Millisecond,
		204 * time.Millisecond,
		337 * time.Millisecond,
	}

	res, err := internalFetch(path)
	if err == nil {
		return res, nil
	}

	// If error is not a helper FetchError (e.g. network error) or is 5xx, we retry
	// If it was a 4xx, internalFetch returned result (not error), so we already returned above.

	for _, d := range delays {
		SleepFunc(d)
		res, err = internalFetch(path)
		if err == nil {
			return res, nil
		}
	}

	// After all retries
	// Return the last error structure if available
	if fErr, ok := err.(*FetchError); ok {
		// If it's a 5xx that failed retries
		// JS logic: returns { ...response, error: true }
		// Wait, JS: catches finally.
		/*
		  .catch((e) => {
		      if (e instanceof SyntaxError) { ... }
		      return { ...e.cause, error: true };
		    });
		*/
		// My internalFetch returns FetchError for 5xx.
		if respMap, ok := fErr.Response.(map[string]interface{}); ok {
			respMap["error"] = true
			return respMap, nil
		}
		return map[string]interface{}{"error": true, "status": fErr.Status}, nil
	}

	// Network error etc
	return map[string]interface{}{"error": true, "message": err.Error()}, nil
}
