package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strconv"
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

	// determine if we want to run alerts in a loop (for NEC)
	oneshot, err := strconv.ParseBool(os.Getenv("ALERTS_ONESHOT"))
	if err != nil {
		oneshot = true
	}
	logger.Info("alerts loop", "oneshot", oneshot)

	if err := run(ctx, logger, oneshot); err != nil {
		logger.Error("alerts run", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, logger *slog.Logger, oneshot bool) error {
	pool, err := internal.NewDBPool(ctx)
	if err != nil {
		return fmt.Errorf("connecting to db: %w", err)
	}
	defer pool.Close()

	if oneshot {
		return alerts.Update(ctx, pool)
	}

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		if alertsErr := alerts.Update(ctx, pool); alertsErr != nil {
			logger.Error("alerts update", "error", alertsErr)
		}

		select {
		case <-ctx.Done():
			logger.Info("shutting down alerts loop")
			return nil
		case <-ticker.C:
			// noop
		}
	}
}
