package ghwo

import (
	"net/http"
	"os"
	"strconv"
	"time"
)

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

var GHWOClient = &http.Client{
	Timeout: getTimeout(),
}

var DefaultBaseURL = "https://www.weather.gov"

func GetBaseURL() string {
	found := os.Getenv("GHWO_BASE_URL")
	if found == "" {
		return DefaultBaseURL
	}
	return found
}
