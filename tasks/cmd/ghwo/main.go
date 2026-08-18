package main

import (
	"context"
	"os"
	"strconv"
	"tasks/internal"
	"tasks/internal/ghwo"
	"time"

	"github.com/newrelic/go-agent/v3/newrelic"
)

var (
	defaultTimeout = 60 * time.Second // 1 minute max
	newRelicApp    *newrelic.Application
)

func getTimeout() time.Duration {
	timeoutStr := os.Getenv("TIMEOUT")
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
	logger := internal.GetJSONLogger("ghwo")
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

	// Open a new db pool connection.
	// If this fails, we bail immediately because we can't
	// really do anything
	dbPool, err := internal.NewDBPool(ctx)
	if err != nil {
		logger.Error("Could not get a db connection", "error", err)
		os.Exit(-1)
	}
	defer dbPool.Close()

	// Get the list of WFOs
	wfos, err := ghwo.GetWFOsFromDatabase(ctx, dbPool)
	if err != nil {
		logger.Error("Could not retrieve WFOs", "error", err)
		os.Exit(-1)
	}

	pipeline := ghwo.NewPipeline(dbPool)

	// Log the start
	logger.Warn(
		"Starting GHWO pipeline",
		"extractionWorkers", pipeline.Managers[0].(*ghwo.ExtractionManager).NumWorkers,
		"transformWorkers", pipeline.Managers[1].(*ghwo.TransformManager).NumWorkers,
		"transformLocalityWorkers", pipeline.Managers[2].(*ghwo.TransformLocalityManager).NumWorkers,
		"errorWorkers", pipeline.Managers[4].(*ghwo.ErrorManager).NumWorkers,
	)

	// Initialize the pipeline
	err = pipeline.Initialize(ctx)
	if err != nil {
		logger.Error("Could not initialize pipeline", "error", err)
		os.Exit(-1)
	}

	// Get the input and send on the pipeline's
	// first manger input channel
	inputChan := pipeline.Managers[0].(*ghwo.ExtractionManager).Input
	go func() {
		for _, wfo := range wfos {
			// Make sure we haven't had a context cancellation yet
			select {
			case <-ctx.Done():
				close(inputChan)
				return
			default:
				inputChan <- wfo
			}
		}
		close(inputChan)
	}()

	pipeline.Run(ctx)

	// Finalize the pipeline results
	err = pipeline.Finalize(ctx)
	if err != nil {
		logger.Error("Could not finalize pipeline", "error", err)
		os.Exit(-1)
	}

	logger.Warn("GHWO update completed")
}
