package main

import (
	"context"
	"fmt"
	"os"

	"tasks/internal"
	"tasks/internal/gridcache"
)

func main() {
	logger := internal.GetJSONLogger()
	ctx := context.Background()

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
