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

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/newrelic/go-agent/v3/newrelic"
)

var (
	// Kills a hung run before the next hourly cron, which would clobber the same staging table
	defaultTimeout = 30 * time.Minute // measured run with all four regions is about 5m30s
	newRelicApp    *newrelic.Application
)

// Time held back from the regions so a stalled one still leaves room to carry forward and swap, ~40s measured
const finalizeReserve = 90 * time.Second

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

	destDir, err := os.MkdirTemp("", "wpcprob-*")
	if err != nil {
		return fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(destDir)

	// Poll WPC until this hour's cycle is published, since the cron fires at :10 and WPC lands around :11
	expectedCycle := wpcprob.AnyCycle
	// OCONUS lands around :22, past WaitForCycle's 90s cap, so it takes the previous hour's cycle
	oconusCycle := wpcprob.AnyCycle
	if !latest {
		hour := time.Now().UTC().Truncate(time.Hour)
		expectedCycle = hour.Format(wpcprob.CycleLayout)
		oconusCycle = hour.Add(-time.Hour).Format(wpcprob.CycleLayout)
	}

	if err := wpcprob.CreateStaging(ctx, pool); err != nil {
		return err
	}

	regionCtx := ctx
	if deadline, ok := ctx.Deadline(); ok {
		var cancelRegions context.CancelFunc
		regionCtx, cancelRegions = context.WithDeadline(ctx, deadline.Add(-finalizeReserve))
		defer cancelRegions()
	}

	gridpoints := 0
	var failed []string
	for _, region := range append([]wpcprob.Region{wpcprob.CONUS}, wpcprob.OCONUSRegions...) {
		cycle := oconusCycle
		if region.Name == wpcprob.CONUS.Name {
			cycle = expectedCycle
		}
		count, err := runRegion(regionCtx, logger, pool, client, region, cycle, destDir)
		if err != nil {
			logger.Error("skipping region", "region", region.Name, "error", err)
			failed = append(failed, region.Name)
			continue
		}
		gridpoints += count
	}
	// Swapping in nothing but carried-forward rows changes nothing
	if gridpoints == 0 {
		return fmt.Errorf("every region failed: %v", failed)
	}

	// Failed regions keep last hour's rows, and if that fails too they go blank while the rest still publishes
	carried, err := wpcprob.CarryForward(ctx, pool)
	if err != nil {
		logger.Error("carry forward failed", "error", err)
	}
	logger.Info("carried forward live rows", "rows", carried)

	logger.Info("finalizing results")
	stageStart := time.Now()
	if err := wpcprob.FinalizeStaging(ctx, pool); err != nil {
		return fmt.Errorf("finalizing results: %w", err)
	}
	logger.Info("finalized results", "duration", time.Since(stageStart).String())

	mem := memStats()
	logger.Info("done", "gridpoints", gridpoints, "failed_regions", failed,
		"heap_sys", mem.HeapSys, "sys", mem.Sys, "total_duration", time.Since(runStart).String())
	return nil
}

// HeapSys is the closest the runtime gets to a peak, so it's the number to watch trend toward the limit
func memStats() runtime.MemStats {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	return mem
}

// Fetch, decode and stage one region's cycle, returning how many gridpoints it wrote
func runRegion(ctx context.Context, logger *slog.Logger, pool *pgxpool.Pool, client *http.Client, region wpcprob.Region, expectedCycle, destDir string) (int, error) {
	logger = logger.With("region", region.Name)
	logger.Info("waiting for cycle", "expected", expectedCycle)

	stageStart := time.Now()
	cycle, fhours, err := wpcprob.WaitForCycle(ctx, client, region, expectedCycle)
	if err != nil {
		return 0, fmt.Errorf("waiting for cycle: %w", err)
	}
	logger.Info("using cycle", "cycle", cycle, "fhours", fhours, "duration", time.Since(stageStart).String())

	cycleTime, err := time.Parse(wpcprob.CycleLayout, cycle)
	if err != nil {
		return 0, fmt.Errorf("parsing cycle %q: %w", cycle, err)
	}
	// fhour is the window end, so each one names the period it closes
	validTimes := make([]time.Time, len(fhours))
	for i, fhour := range fhours {
		hours, err := strconv.Atoi(fhour)
		if err != nil {
			return 0, fmt.Errorf("parsing fhour %q: %w", fhour, err)
		}
		validTimes[i] = cycleTime.Add(time.Duration(hours) * time.Hour)
	}
	logger.Info("periods", "valid_times", validTimes)

	bands := wpcprob.BandList(region.Variables)
	logger.Info("downloading bands", "bands", len(bands), "periods", len(fhours))
	stageStart = time.Now()
	missing, err := wpcprob.DownloadBands(ctx, client, region, cycle, fhours, destDir, bands)
	if err != nil {
		return 0, fmt.Errorf("downloading bands: %w", err)
	}
	if len(missing) > 0 {
		logger.Warn("files not served, decoding without them", "count", len(missing), "files", missing)
	}
	logger.Info("downloaded bands", "misses", len(missing), "duration", time.Since(stageStart).String())

	logger.Info("loading gridpoints")
	stageStart = time.Now()
	gridpoints, wfos, err := wpcprob.LoadGridpoints(ctx, pool, region)
	if err != nil {
		return 0, fmt.Errorf("loading gridpoints: %w", err)
	}
	logger.Info("loaded gridpoints", "count", len(gridpoints), "wfos", len(wfos), "duration", time.Since(stageStart).String())

	// One transaction per region, so a failure rolls back to no rows instead of half-written ones
	tx, err := pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("starting region transaction: %w", err)
	}
	// No-op after Commit, and Postgres aborts the transaction anyway if a dead ctx drops the connection
	defer tx.Rollback(context.Background())

	logger.Info("staging results")
	stageStart = time.Now()
	if err := wpcprob.SeedStaging(ctx, tx, gridpoints, wfos, cycleTime, validTimes); err != nil {
		return 0, fmt.Errorf("staging gridpoints: %w", err)
	}
	logger.Info("staged results", "duration", time.Since(stageStart).String())

	logger.Info("decoding and storing bands", "count", len(bands)*len(fhours))
	stageStart = time.Now()
	store := func(variable string, matrix *wpcprob.VariableMatrix) error {
		return wpcprob.StoreVariable(ctx, tx, variable, matrix, gridpoints, wfos)
	}
	if err := wpcprob.DecodeAndStoreVariables(ctx, logger, "wgrib2", destDir, region, cycle, fhours, bands, gridpoints, store); err != nil {
		return 0, err
	}
	logger.Info("decoded and stored bands", "duration", time.Since(stageStart).String())

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("committing region: %w", err)
	}

	logger.Info("region done", "cycle", cycle, "fhours", fhours, "gridpoints", len(gridpoints), "heap_sys", memStats().HeapSys)
	return len(gridpoints), nil
}
