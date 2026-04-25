package data

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

func getAPIURL() string {
	apiUrl := os.Getenv("API_URL")
	if apiUrl == "" {
		apiUrl = "http://api-proxy:8081"
	}
	return apiUrl
}

func FetchAPI(apiPath string) ([]byte, int, error) {
	url := getAPIURL() + apiPath

	resp, err := http.Get(url)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	if resp.StatusCode >= 400 {
		return body, resp.StatusCode, fmt.Errorf("HTTP error %d", resp.StatusCode)
	}

	return body, resp.StatusCode, nil
}

func FetchAPICached(ctx context.Context, apiPath string) ([]byte, int, error) {
	if RedisClient == nil {
		return FetchAPI(apiPath)
	}

	cacheKey := "interop:api:" + apiPath
	cached, err := RedisClient.Get(ctx, cacheKey).Bytes()
	
	if err == nil && len(cached) > 0 {
		// Stale-While-Revalidate: Fetch fresh data in the background
		go func() {
			bgCtx := context.Background()
			body, status, fetchErr := FetchAPI(apiPath)
			if fetchErr == nil && status == http.StatusOK {
				RedisClient.Set(bgCtx, cacheKey, body, 2*time.Hour)
			}
		}()
		return cached, http.StatusOK, nil
	}

	body, status, err := FetchAPI(apiPath)
	if err == nil && status == http.StatusOK {
		RedisClient.Set(ctx, cacheKey, body, 2*time.Hour)
	}

	return body, status, err
}
