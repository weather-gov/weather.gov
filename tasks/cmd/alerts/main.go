package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"tasks/internal"
	"tasks/internal/alerts"

	"github.com/newrelic/go-agent/v3/newrelic"
)

var newRelicApp *newrelic.Application

func main() {
	logger := internal.GetJSONLogger("alerts")
	ctx := context.Background()

	if internal.IsRunningOnCF() {
		app, nrErr := internal.EnableNewRelic()
		if nrErr != nil {
			logger.Error("could not enable new relic", "err", nrErr)
		} else {
			newRelicApp = app
			defer newRelicApp.Shutdown(10 * time.Second)
		}
	}

	if err := run(ctx); err != nil {
		logger.Error("alerts failed", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context) error {
	pool, err := internal.NewDBPool(ctx)
	if err != nil {
		return fmt.Errorf("connecting to db: %w", err)
	}
	defer pool.Close()

	return alerts.Update(ctx, pool)
}
