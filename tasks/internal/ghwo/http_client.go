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
