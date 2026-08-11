package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"tasks/internal"
	"tasks/internal/gridcache"

	"github.com/newrelic/go-agent/v3/newrelic"
)

var newRelicApp *newrelic.Application

func main() {
	logger := internal.GetJSONLogger("gridcache")
	ctx := context.Background()

	// connect to new relic
	if internal.IsRunningOnCF() {
		app, nrErr := internal.EnableNewRelic()
		if nrErr != nil {
			logger.Error("could not enable new relic", "err", nrErr)
		} else {
			newRelicApp = app
			defer newRelicApp.Shutdown(10 * time.Second)
		}
	}

	if err := run(ctx, logger); err != nil {
		logger.Error("gridcache failed", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, logger interface{ Info(string, ...any) }) error {
	pool, err := internal.NewDBPool(ctx)
	if err != nil {
		return fmt.Errorf("connecting to db: %w", err)
	}
	defer pool.Close()

	hotspots, err := gridcache.Process(ctx, pool)
	if err != nil {
		return fmt.Errorf("processing heat interval: %w", err)
	}

	logger.Info("heat interval processed", "hotspots", hotspots)
	return nil
}
