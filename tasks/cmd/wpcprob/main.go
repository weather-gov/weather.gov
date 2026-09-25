package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"tasks/internal"
	"tasks/internal/wpcprob"

	"github.com/newrelic/go-agent/v3/newrelic"
)

var (
	// Kills a hung run before the next hourly cron, which would clobber the same staging table
	defaultTimeout = 6 * time.Minute // measured run is about 4m45s
	newRelicApp    *newrelic.Application
)

// Covers wgrib2 and the alerts/ghwo/gridcache tasks in the same cgroup, none of which the runtime sees
const memoryLimitHeadroomBytes = 512 << 20

// The 2G instance minus that headroom, against ~435MB live
const defaultMemoryLimitBytes = 1536 << 20

// ghwo shares this container and reads plain TIMEOUT, so the name is qualified to keep its 60 s bound
func getTimeout() time.Duration {
	timeoutStr := os.Getenv("WPCPROB_TIMEOUT")
	if timeoutStr == "" {
		return defaultTimeout
	}
	timeout, err := strconv.Atoi(timeoutStr)
	if err != nil {
		return defaultTimeout
	}
	return time.Duration(timeout) * time.Second
}

func main() {
	latest := flag.Bool("latest", false, "run against the newest published cycle instead of waiting for the current hour's")
	flag.Parse()

	logger := internal.GetJSONLogger("wpcprob")

	// Soft limit, so it pressures GC but won't stop a cgroup OOM kill
	memLimit := memoryLimitBytes()
	debug.SetMemoryLimit(memLimit)
	logger.Info("memory limit", "bytes", memLimit, "cgroup", os.Getenv("MEMORY_LIMIT"))

	ctx, cancel := context.WithTimeout(context.Background(), getTimeout())
	defer cancel()

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

	if err := run(ctx, logger, *latest); err != nil {
		logger.Error("wpcprob failed", "error", err)
		os.Exit(1)
	}
}

func memoryLimitBytes() int64 {
	limit := os.Getenv("MEMORY_LIMIT")
	megabytes, err := strconv.Atoi(strings.TrimRight(limit, "mMgG"))
	if err != nil || megabytes <= 0 {
		return defaultMemoryLimitBytes
	}
	if strings.ContainsAny(limit, "gG") {
		megabytes *= 1024
	}
	bytes := int64(megabytes) << 20
	if bytes <= memoryLimitHeadroomBytes {
		return defaultMemoryLimitBytes
	}
	return bytes - memoryLimitHeadroomBytes
}

func run(ctx context.Context, logger *slog.Logger, latest bool) error {
	runStart := time.Now()

	pool, err := internal.NewDBPool(ctx)
	if err != nil {
		return fmt.Errorf("connecting to db: %w", err)
	}
	defer pool.Close()

	client := &http.Client{Timeout: 30 * time.Second}

	// Poll WPC until this hour's cycle is published, since the cron fires at :10 and WPC lands around :11
	expectedCycle := wpcprob.AnyCycle
	if !latest {
		expectedCycle = time.Now().UTC().Truncate(time.Hour).Format(wpcprob.CycleLayout)
	}
	logger.Info("waiting for cycle", "expected", expectedCycle)

	stageStart := time.Now()
	cycle, fhours, err := wpcprob.WaitForCycle(ctx, client, expectedCycle)
	if err != nil {
		return fmt.Errorf("waiting for cycle: %w", err)
	}
	logger.Info("using cycle", "cycle", cycle, "fhours", fhours, "duration", time.Since(stageStart).String())

	cycleTime, err := time.Parse(wpcprob.CycleLayout, cycle)
	if err != nil {
		return fmt.Errorf("parsing cycle %q: %w", cycle, err)
	}
	// fhour is the window end, so each one names the period it closes
	validTimes := make([]time.Time, len(fhours))
	for i, fhour := range fhours {
		hours, err := strconv.Atoi(fhour)
		if err != nil {
			return fmt.Errorf("parsing fhour %q: %w", fhour, err)
		}
		validTimes[i] = cycleTime.Add(time.Duration(hours) * time.Hour)
	}
	logger.Info("periods", "valid_times", validTimes)

	destDir, err := os.MkdirTemp("", "wpcprob-*")
	if err != nil {
		return fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(destDir)

	bands := wpcprob.BandList()
	logger.Info("downloading bands", "bands", len(bands), "periods", len(fhours))
	stageStart = time.Now()
	missing, err := wpcprob.DownloadBands(ctx, client, cycle, fhours, destDir, bands)
	if err != nil {
		return fmt.Errorf("downloading bands: %w", err)
	}
	if len(missing) > 0 {
		logger.Warn("files not served, decoding without them", "count", len(missing), "files", missing)
	}
	logger.Info("downloaded bands", "misses", len(missing), "duration", time.Since(stageStart).String())

	logger.Info("loading gridpoints")
	stageStart = time.Now()
	gridpoints, wfos, err := wpcprob.LoadGridpoints(ctx, pool)
	if err != nil {
		return fmt.Errorf("loading gridpoints: %w", err)
	}
	logger.Info("loaded gridpoints", "count", len(gridpoints), "wfos", len(wfos), "duration", time.Since(stageStart).String())

	logger.Info("staging results")
	stageStart = time.Now()
	if err := wpcprob.CreateStaging(ctx, pool, gridpoints, wfos, cycleTime, validTimes); err != nil {
		return fmt.Errorf("creating staging table: %w", err)
	}
	logger.Info("staged results", "duration", time.Since(stageStart).String())

	logger.Info("decoding and storing bands", "count", len(bands)*len(fhours))
	stageStart = time.Now()
	store := func(variable string, matrix *wpcprob.VariableMatrix) error {
		return wpcprob.StoreVariable(ctx, pool, variable, matrix, gridpoints, wfos)
	}
	if err := wpcprob.DecodeAndStoreVariables(ctx, logger, "wgrib2", destDir, cycle, fhours, bands, gridpoints, store); err != nil {
		return err
	}
	logger.Info("decoded and stored bands", "duration", time.Since(stageStart).String())

	logger.Info("finalizing results")
	stageStart = time.Now()
	if err := wpcprob.FinalizeStaging(ctx, pool); err != nil {
		return fmt.Errorf("finalizing results: %w", err)
	}
	logger.Info("finalized results", "duration", time.Since(stageStart).String())

	// HeapSys is the closest the runtime gets to a peak, so it's the number to watch trend toward the limit
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	logger.Info("done", "cycle", cycle, "fhours", fhours, "gridpoints", len(gridpoints),
		"heap_sys", mem.HeapSys, "sys", mem.Sys, "total_duration", time.Since(runStart).String())
	return nil
}
