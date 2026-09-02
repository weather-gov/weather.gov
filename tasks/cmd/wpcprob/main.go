package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"tasks/internal"
	"tasks/internal/wpcprob"

	"github.com/newrelic/go-agent/v3/newrelic"
)

var newRelicApp *newrelic.Application

func main() {
	logger := internal.GetJSONLogger("wpcprob")
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
		logger.Error("wpcprob failed", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, logger *slog.Logger) error {
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
	bands, missing, err := wpcprob.DownloadBands(ctx, client, cycle, fhour, destDir, bands)
	if err != nil {
		return fmt.Errorf("downloading bands: %w", err)
	}
	if len(missing) > 0 {
		logger.Warn("bands not published, decoding without them", "count", len(missing), "bands", missing)
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

	// Seed the staging table with one identity row per gridpoint, ahead of any band being decoded
	logger.Info("staging results")
	stageStart = time.Now()
	if err := wpcprob.CreateStaging(ctx, pool, gridpoints, cycleTime, validTime); err != nil {
		return fmt.Errorf("creating staging table: %w", err)
	}
	logger.Info("staged results", "duration", time.Since(stageStart).String())

	// Decode each variable's bands one at a time, then store the whole variable in a single write pass
	logger.Info("decoding and storing bands", "count", len(bands))
	stageStart = time.Now()
	store := func(variable string, matrix *wpcprob.VariableMatrix) error {
		return wpcprob.StoreVariable(ctx, pool, variable, matrix, gridpoints)
	}
	if err := wpcprob.DecodeAndStoreVariables(wgrib2Bin, destDir, cycle, fhour, bands, gridpoints, store); err != nil {
		return err
	}
	logger.Info("decoded and stored bands", "count", len(bands), "duration", time.Since(stageStart).String())

	// Swap the staging table into place as the live table
	logger.Info("finalizing results")
	stageStart = time.Now()
	if err := wpcprob.FinalizeStaging(ctx, pool); err != nil {
		return fmt.Errorf("finalizing results: %w", err)
	}
	logger.Info("finalized results", "duration", time.Since(stageStart).String())

	logger.Info("done", "cycle", cycle, "fhour", fhour, "gridpoints", len(gridpoints), "total_duration", time.Since(runStart).String())
	return nil
}
