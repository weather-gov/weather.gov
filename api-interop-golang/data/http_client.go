package data

import (
	"fmt"
	"io"
	"net/http"
	"os"
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
