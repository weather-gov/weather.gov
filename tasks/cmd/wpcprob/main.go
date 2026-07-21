package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"tasks/internal"
	"tasks/internal/wpcprob"
)

func main() {
	logger := internal.GetJSONLogger()
	ctx := context.Background()

	if err := run(ctx, logger); err != nil {
		logger.Error("wpcprob failed", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, logger interface{ Info(string, ...any) }) error {
	runStart := time.Now()

	// Connect to the db
	pool, err := internal.NewDBPool(ctx)
	if err != nil {
		return fmt.Errorf("connecting to db: %w", err)
	}
	defer pool.Close()

	client := &http.Client{Timeout: 30 * time.Second}

	// Poll WPC until this hour's cycle is published
	expectedCycle := time.Now().UTC().Truncate(time.Hour).Format("2006010215")
	logger.Info("waiting for cycle", "expected", expectedCycle)

	stageStart := time.Now()
	cycle, fhour, err := wpcprob.WaitForCycle(ctx, client, expectedCycle)
	if err != nil {
		return fmt.Errorf("waiting for cycle: %w", err)
	}
	logger.Info("using cycle", "cycle", cycle, "fhour", fhour, "duration", time.Since(stageStart).String())

	// Work out the forecast valid time (cycle time + forecast hour)
	cycleTime, err := time.Parse("2006010215", cycle)
	if err != nil {
		return fmt.Errorf("parsing cycle %q: %w", cycle, err)
	}
	fhourInt, err := strconv.Atoi(fhour)
	if err != nil {
		return fmt.Errorf("parsing fhour %q: %w", fhour, err)
	}
	validTime := cycleTime.Add(time.Duration(fhourInt) * time.Hour)

	destDir, err := os.MkdirTemp("", "wpcprob-*")
	if err != nil {
		return fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(destDir)

	// Download the grib2 probability bands for this cycle
	bands := wpcprob.BandList()
	logger.Info("downloading bands", "count", len(bands))
	stageStart = time.Now()
	if err := wpcprob.DownloadBands(ctx, client, cycle, fhour, destDir, bands); err != nil {
		return fmt.Errorf("downloading bands: %w", err)
	}
	logger.Info("downloaded bands", "count", len(bands), "duration", time.Since(stageStart).String())

	// Load the gridpoints we need values for
	logger.Info("loading gridpoints")
	stageStart = time.Now()
	gridpoints, err := wpcprob.LoadGridpoints(ctx, pool)
	if err != nil {
		return fmt.Errorf("loading gridpoints: %w", err)
	}
	logger.Info("loaded gridpoints", "count", len(gridpoints), "duration", time.Since(stageStart).String())

	wgrib2Bin := "wgrib2"
	if v := os.Getenv("WGRIB2_BIN"); v != "" {
		wgrib2Bin = v
	}

	// Decode each band with wgrib2 and extract values at the gridpoints
	logger.Info("decoding bands", "count", len(bands))
	stageStart = time.Now()
	matrix := wpcprob.NewValueMatrix(bands, len(gridpoints))
	if err := wpcprob.DecodeBands(wgrib2Bin, destDir, cycle, fhour, bands, gridpoints, matrix); err != nil {
		return err
	}
	logger.Info("decoded bands", "count", len(bands), "duration", time.Since(stageStart).String())

	// Persist the results
	logger.Info("storing results")
	stageStart = time.Now()
	if err := wpcprob.StoreResults(ctx, pool, gridpoints, matrix, cycleTime, validTime); err != nil {
		return fmt.Errorf("storing results: %w", err)
	}
	logger.Info("stored results", "duration", time.Since(stageStart).String())

	logger.Info("done", "cycle", cycle, "fhour", fhour, "gridpoints", len(gridpoints), "total_duration", time.Since(runStart).String())
	return nil
}
