package ghwo

import (
	"context"
	"fmt"
	"sync"
)

/**
* Represents the extraction stage of the pipeline
 */
type ExtractionManager struct {
	Input      chan string // the WFO
	Output     chan *FetchResult
	NumWorkers int
	Errors     []error
}

/**
* Represents the first transformation stage of the pipeline.
* This stage handles processing the overall chicklet and legend
* for each WFO, then pulls out each constituent county and state
* into a separate LocalityResult, which is passed to the next
* transformation stage
 */
type TransformManager struct {
	Input      chan *FetchResult
	Output     chan *LocalityResult
	NumWorkers int
	Errors     []error
}

/**
* Represents the second transformation state, in which a LocalityStruct
* corresponding to either source county or source state data is then
* processed into an Output struct
 */
type TransformLocalityManager struct {
	Input      chan *LocalityResult
	Output     chan *Output
	NumWorkers int
	Errors     []error
}

/* Not yet fully implemented */
type StoreManager struct {
	Input  chan *Output
	Output chan bool
	Errors []error
}

// An interim struct for state or county locality data
// that can be used to pass on ephemeral channels during
// transformation.
// "Locality" here refers to either State or County data
type LocalityResult struct {
	Type     string              // will be "state" or "county"
	Code     LocalityCode        // fips for county, XX for state
	Legend   OutputSummaryLegend // processed legend data
	Chicklet ChickletLookup      // processed chicklet data
	GHWOData *SourceGHWOData
}

// Convenience function for sending an error to a channel
// via a goroutine. Takes a sync WaitGroup as an argument
func sendError(err error, errChan chan error, wg *sync.WaitGroup) {
	wg.Add(1)
	go func() {
		defer wg.Done()
		errChan <- err
	}()
}

/**
* Workers here handle fetching all GHWO data for each of the WFOs that come in
* via the manager's input channel. They transform the JSON results into our source
* struct types that later stages will use for processing and storage.
 */
func (extractionManager *ExtractionManager) RunWorkers(ctx context.Context) {
	var wg = sync.WaitGroup{}

	// Collect the errors as they come in
	errorChan := make(chan error, 100)
	errorWg := sync.WaitGroup{}

	// Spawn a new goroutine each for numWorkers.
	// Each of these goroutines will run a for select loop
	// on the channels, exiting only when the right conditions are met.
	for i := 0; i < extractionManager.NumWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for {
				select {
				case <-ctx.Done():
					sendError(ctx.Err(), errorChan, &errorWg)
					return
				case wfoCode, inputIsOpen := <-extractionManager.Input:
					if !inputIsOpen {
						// The channel has closed, so we can bail
						return
					}
					fetchResult, errors := FetchWFO(ctx, wfoCode)
					if len(errors) > 0 {
						for i := 0; i < len(errors); i++ {
							sendError(errors[i], errorChan, &errorWg)
						}
						logger.Warn(
							fmt.Sprintf(
								"Error(s) fetching %s:\n%s",
								wfoCode,
								errors,
							),
						)

						// Do not pass any FetchResults that have errors.
						// Instead, continue the listening loop
						continue
					}

					// Otherwise, we have a good FetchResult that we can send
					// on the output channel
					extractionManager.Output <- fetchResult
				}
			}
		}(i)
	}

	// Wait for all workers to finish, then close the
	// output channel
	wg.Wait()
	errorWg.Wait()
	close(errorChan)

	// Collect the errors from the error channel
	for err := range errorChan {
		extractionManager.Errors = append(
			extractionManager.Errors,
			err,
		)
	}

	close(extractionManager.Output)
}

/**
* Each worker in this stage handles the processing of WFO level legend and
* chicklet data, as well as bundling each county and state into a LocalityResult
* that is emitted on the output channel and sent to the second transformation stage
 */
func (transformManager *TransformManager) RunWorkers(ctx context.Context) {
	var wg = sync.WaitGroup{}

	// Collect the errors as they come in
	errorChan := make(chan error, 100)
	errorWg := sync.WaitGroup{}

	// Spawn a new goroutine each for numWorkers.
	// Each of these goroutines will run a for select loop
	// on the channels, exiting only when the right conditions are met.
	for i := 0; i < transformManager.NumWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					sendError(ctx.Err(), errorChan, &errorWg)
					return

				case fetchResult, inputIsOpen := <-transformManager.Input:
					if !inputIsOpen {
						return
					}

					legend := fetchResult.Legend.ProcessOutputLegend()
					chicklet := fetchResult.Chicklet.GetRiskToHazardLookup()

					// We need to loop through each county and state,
					// create a LocalityStruct, then send that struct
					// to the next stage whose input handles LocalityResults
					for fipsCode, _ := range fetchResult.GHWOData.Counties {
						locality := LocalityResult{
							Type:     "county",
							Code:     fipsCode,
							Legend:   legend,
							Chicklet: chicklet,
							GHWOData: fetchResult.GHWOData,
						}

						select {
						case <-ctx.Done():
							return
						case transformManager.Output <- &locality:
						}

					}

					for stateCode, stateData := range fetchResult.States {
						locality := LocalityResult{
							Type:     "state",
							Code:     stateCode,
							GHWOData: fetchResult.GHWOData,
						}

						// If the overall FetchResult has nil legend and/or
						// chicklet for a specific state, that means that there
						// was no state-specific chicklet/legend available.
						// Not all states have this data (see the mappings.go file
						// for a list of states that do).
						// We still pass on the state level data with empty legend
						// and chicklet fields, however, because we can process
						// the overall risk composite -- but no the details -- for these
						// states.
						if stateData.Legend != nil && stateData.Chicklet != nil {
							locality.Legend = stateData.Legend.ProcessOutputLegend()
							locality.Chicklet = stateData.Chicklet.GetRiskToHazardLookup()
						}

						select {
						case <-ctx.Done():
							return
						case transformManager.Output <- &locality:
						}
					}
				}
			}
		}(i)
	}

	wg.Wait()
	errorWg.Wait()
	close(errorChan)

	// Collect the errors
	for err := range errorChan {
		transformManager.Errors = append(
			transformManager.Errors,
			err,
		)
	}

	close(transformManager.Output)
}

/**
* Each worker in this stage will transform a given LocalityResult struct into
* an Output struct.
* It represents the second transformation stage, where individual counties and
* states that make up a batch of WFO data are processed and emitted on the
* output channel.
 */
func (manager *TransformLocalityManager) RunWorkers(ctx context.Context) {
	var wg = sync.WaitGroup{}

	// Collect the errors as they come in
	errorChan := make(chan error, 100)
	errorWg := sync.WaitGroup{}

	// Spawn a new goroutine for each numWorker.
	// Each of these goroutines will run a for-select loop
	// on the channels, exiting only when the right conditions
	// have been met
	for i := 0; i < manager.NumWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					sendError(ctx.Err(), errorChan, &errorWg)
					return

				case locality, isOpen := <-manager.Input:
					if !isOpen {
						// The input channel has closed, so
						// return (which will close the output chan)
						return
					}

					if locality.Type == "county" {
						countyData, ok := locality.GHWOData.Counties[locality.Code]
						if !ok {
							sendError(
								fmt.Errorf("Could not find county data for locality code %s (in worker %d)", locality.Code, workerID),
								errorChan,
								&errorWg,
							)
							continue
						}

						output := ProcessCounty(
							locality.GHWOData.WFO,
							locality.Code,
							&countyData,
							locality.Legend,
							locality.Chicklet,
						)
						manager.Output <- output
					} else if locality.Type == "state" {
						stateData, ok := locality.GHWOData.States[locality.Code]
						if !ok {
							sendError(
								fmt.Errorf("Could not ind state data for state code %s (in worker %d)", locality.Code, workerID),
								errorChan,
								&errorWg,
							)
							continue
						}
						// If either the legend or the chicklet for the stateData is
						// missing, we process the state _without_ the details
						// (ie, we only process a composite)
						var output *Output
						if locality.Legend == nil || locality.Chicklet == nil {
							output = ProcessStateWithoutDetails(
								locality.GHWOData.WFO,
								locality.Code,
								&stateData,
							)
							manager.Output <- output
						} else {
							output = ProcessStateWithDetails(
								locality.GHWOData.WFO,
								locality.Code,
								&stateData,
								locality.Legend,
								locality.Chicklet,
							)
							manager.Output <- output
						}
					} else {
						sendError(
							fmt.Errorf("Cannot process locality of type %s (in worker %d)", locality.Type, workerID),
							errorChan,
							&errorWg,
						)
						continue
					}
				}
			}
		}(i)
	}

	wg.Wait()
	errorWg.Wait()
	close(errorChan)

	// Collect the errors
	for err := range errorChan {
		manager.Errors = append(
			manager.Errors,
			err,
		)
	}

	close(manager.Output)
}
