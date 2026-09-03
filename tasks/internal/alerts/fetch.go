package alerts

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"tasks/internal"
)

var logger = internal.GetJSONLogger("alerts")

var DefaultTimeout = 30 * time.Second

func getTimeout() time.Duration {
	timeout := os.Getenv("CLIENT_TIMEOUT_MILLISECONDS")
	if timeout != "" {
		milliseconds, err := strconv.Atoi(timeout)
		if err == nil {
			return time.Duration(milliseconds) * time.Millisecond
		}
	}
	return DefaultTimeout
}

var AlertsClient = &http.Client{
	Timeout: getTimeout(),
}

var DefaultBaseURL = "https://api.weather.gov"

func GetBaseURL() string {
	found := os.Getenv("API_URL")
	if found == "" {
		return DefaultBaseURL
	}
	return found
}

const activeAlertsPath = "/alerts/active?status=actual"

// The same headers interop sends
var standardHeaders = map[string]string{
	"User-Agent": "beta.weather.gov interop",
	"Accept":     "application/json",
}

// Caller must close the response body
func doGet(ctx context.Context, client *http.Client, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range standardHeaders {
		req.Header.Set(k, v)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, fmt.Errorf("%s: %s", url, resp.Status)
	}
	return resp, nil
}

func httpGet(ctx context.Context, client *http.Client, url string) ([]byte, error) {
	resp, err := doGet(ctx, client, url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func hashProperties(raw json.RawMessage) (string, error) {
	// Compacted because upstream pretty-prints, and not through a map because that sorts the keys
	var compact bytes.Buffer
	if err := json.Compact(&compact, raw); err != nil {
		return "", fmt.Errorf("compacting properties: %w", err)
	}
	sum := sha256.Sum256(compact.Bytes())
	return base64.StdEncoding.EncodeToString(sum[:]), nil
}

// Every active alert, with its hash and decoded properties attached
func Fetch(ctx context.Context) ([]SourceFeature, error) {
	body, err := httpGet(ctx, AlertsClient, GetBaseURL()+activeAlertsPath)
	if err != nil {
		return nil, fmt.Errorf("fetching alerts: %w", err)
	}

	var response SourceResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("decoding alerts: %w", err)
	}

	// An empty array is fine, but a missing features key means something upstream broke
	if response.Features == nil {
		return nil, fmt.Errorf("malformed API response: missing features array")
	}

	for i := range response.Features {
		feature := &response.Features[i]

		// Hash the raw bytes so nothing downstream can change an alert's identity
		hash, err := hashProperties(feature.Properties)
		if err != nil {
			return nil, err
		}
		feature.Hash = hash

		if err := json.Unmarshal(feature.Properties, &feature.Props); err != nil {
			return nil, fmt.Errorf("decoding alert properties: %w", err)
		}
	}

	return response.Features, nil
}
