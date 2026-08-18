package ghwo

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

/**
* Constants and environment variables
 */
const (
	DefaultExtractionWorkers        int = 100
	DefaultTransformWorkers         int = 60
	DefaultTransformLocalityWorkers int = 60
	DefaultErrorWorkers                 = 100
)

/**
* Represents the extraction stage of the pipeline
 */
type ExtractionManager struct {
	Input      chan string // the WFO
	Output     chan *FetchResult
	NumWorkers int
	Errors     []error
	ErrorChan  chan *GHWOError
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
	ErrorChan  chan *GHWOError
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
	ErrorChan  chan *GHWOError
}

/* Not yet fully implemented */
type StoreManager struct {
	Input      chan *Output
	Errors     []error
	Pool       *pgxpool.Pool
	ErrorChan  chan *Output
	StoreBatch *StoreBatch
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

/**
* Represents a generic manager for handling errors.
* This stage/manager will "branch" from the others, listening
* for input on the overall Pipeline's error channel.
 */
type ErrorManager struct {
	Input      chan *GHWOError
	Output     chan *Output
	NumWorkers int
}

type WorkerRunner interface {
	RunWorkers(ctx context.Context)
}

/**
* A Pipeline is a struct that has an ordered list of
* managers, which, when initialized, will each link their
* outputs to the previous manager's input.
 */
type Pipeline struct {
	Managers  []WorkerRunner
	ErrorChan chan *GHWOError
}

/**
* The number of workers for each manager/stage type
* will be set by environment variables. If the corresponding variable
* is not available, we use the default constant specified in this file
 */
func (manager *ExtractionManager) setNumWorkers() {
	found := os.Getenv("E_WORKER_NUM")
	if found == "" {
		manager.NumWorkers = DefaultExtractionWorkers
		return
	}
	foundNum, err := strconv.Atoi(found)
	if err != nil {
		manager.NumWorkers = DefaultExtractionWorkers
		return
	}
	manager.NumWorkers = foundNum
}

func (manager *TransformManager) setNumWorkers() {
	found := os.Getenv("T_WORKER_NUM")
	if found == "" {
		manager.NumWorkers = DefaultTransformWorkers
		return
	}
	foundNum, err := strconv.Atoi(found)
	if err != nil {
		manager.NumWorkers = DefaultTransformWorkers
		return
	}
	manager.NumWorkers = foundNum
}

func (manager *TransformLocalityManager) setNumWorkers() {
	found := os.Getenv("TL_WORKER_NUM")
	if found == "" {
		manager.NumWorkers = DefaultTransformLocalityWorkers
		return
	}
	foundNum, err := strconv.Atoi(found)
	if err != nil {
		manager.NumWorkers = DefaultTransformLocalityWorkers
		return
	}
	manager.NumWorkers = foundNum
}

func (manager *ErrorManager) setNumWorkers() {
	found := os.Getenv("ERR_WORKER_NUM")
	if found == "" {
		manager.NumWorkers = DefaultErrorWorkers
		return
	}
	foundNum, err := strconv.Atoi(found)
	if err != nil {
		manager.NumWorkers = DefaultErrorWorkers
		return
	}
	manager.NumWorkers = foundNum
}

/**
* Workers here handle fetching all GHWO data for each of the WFOs that come in
* via the manager's input channel. They transform the JSON results into our source
* struct types that later stages will use for processing and storage.
 */
func (extractionManager *ExtractionManager) RunWorkers(ctx context.Context) {
	var wg = sync.WaitGroup{}

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
					return
				case wfoCode, inputIsOpen := <-extractionManager.Input:
					if !inputIsOpen {
						// The channel has closed, so we can bail
						return
					}
					fetchResult, errors := FetchWFO(ctx, wfoCode)
					if len(errors) > 0 {
						// Loop through any errors and send those on the
						// error channel
						for _, ghwoError := range GHWOErrorsFromFetchResult(fetchResult) {
							select {
							case <-ctx.Done():
								return
							case extractionManager.ErrorChan <- ghwoError:
							}
						}
						// Do not pass any FetchResults that have errors.
						// Instead, continue the listening loop
						logger.Warn("Could not fetch data for WFO", "wfo", wfoCode, "numErrors", len(errors))
						continue
					}

					// Otherwise, we have a good FetchResult that we can send
					// on the output channel
					select {
					case <-ctx.Done():
						return
					case extractionManager.Output <- fetchResult:
					}
				}
			}
		}(i)
	}

	// Wait for all workers to finish, then close the
	// output channel
	wg.Wait()

	close(extractionManager.Output)
	logger.Warn("ExtractionManager exited")
}

/**
* Each worker in this stage handles the processing of WFO level legend and
* chicklet data, as well as bundling each county and state into a LocalityResult
* that is emitted on the output channel and sent to the second transformation stage
 */
func (transformManager *TransformManager) RunWorkers(ctx context.Context) {
	var wg = sync.WaitGroup{}

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

	close(transformManager.Output)
	logger.Warn("TransformManager exited")
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
							err := NewGHWOErrorForCounty(
								locality.Code,
								locality.GHWOData.WFO,
								[]error{
									fmt.Errorf("Could not find county data for locality code %s (in worker %d)", locality.Code, workerID),
								},
							)
							// Send the error to the ErrorChan
							select {
							case <-ctx.Done():
								return
							case manager.ErrorChan <- err:
							}
							continue
						}

						output := ProcessCounty(
							locality.GHWOData.WFO,
							locality.Code,
							&countyData,
							locality.Legend,
							locality.Chicklet,
						)
						select {
						case <-ctx.Done():
							return
						case manager.Output <- output:
						}
					} else if locality.Type == "state" {
						stateData, ok := locality.GHWOData.States[locality.Code]
						if !ok {
							err := NewGHWOErrorForState(
								locality.Code,
								locality.GHWOData.WFO,
								[]error{
									fmt.Errorf("Could not find state data for state code %s (in worker %d)", locality.Code, workerID),
								},
							)

							// Send on the error channel
							select {
							case <-ctx.Done():
								return
							case manager.ErrorChan <- err:
							}
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
							select {
							case <-ctx.Done():
								return
							case manager.Output <- output:
							}
						} else {
							output = ProcessStateWithDetails(
								locality.GHWOData.WFO,
								locality.Code,
								&stateData,
								locality.Legend,
								locality.Chicklet,
							)
							select {
							case <-ctx.Done():
								return
							case manager.Output <- output:
							}
						}
					} else {
						// Otherwise, compose and send a generic error
						// on the manager's ErrorChan.
						err := NewGenericGHWOError(
							fmt.Errorf("Cannot process locality of type %s (in worker %d)", locality.Type, workerID),
						)
						err.Locality = locality.Code
						err.WFO = locality.GHWOData.WFO
						select {
						case <-ctx.Done():
							return
						case manager.ErrorChan <- err:
						}
						continue
					}
				}
			}
		}(i)
	}

	wg.Wait()

	close(manager.Output)
	close(manager.ErrorChan)
	logger.Warn("TransformLocalityManager exited")
}

func (manager *StoreManager) RunWorkers(ctx context.Context) {
	// Initialize a StoreBatch to track our batches,
	// whose methods allow us to check and flush
	// as we add
	storeBatch := NewBatch(40)

	// We need to keep track of discovering when
	// either of the input channels is closed.
	// When the are both closed, that's the only time we
	// can return from the anonymous function
	inputClosed := false
	errorClosed := false

	// The storage manager will run on a synchronous for-select
	// (ie, there are no workers) until the input channel is closed
	// or the context is cancelled
	func() {
		for {
			if inputClosed && errorClosed {
				return
			}
			select {
			case <-ctx.Done():
				manager.Errors = append(
					manager.Errors,
					ctx.Err(),
				)
				return
			case processedOutput, isOpen := <-manager.Input:
				if !isOpen {
					// We continue here because the TransformLocalityManager
					// will need to signal completion on the StoreManager.ShouldClose
					// channel.
					// This is because we need to check two channels at the
					// same time (input and error) and only return when we are sure
					// that both of them are closed
					inputClosed = true
					continue
				}

				shouldFlush := storeBatch.add(processedOutput)
				if shouldFlush {
					err := storeBatch.flush(ctx, manager.Pool)
					if err != nil {
						manager.Errors = append(
							manager.Errors,
							err,
						)
					}
				}

			case incomingError, isOpen := <-manager.ErrorChan:
				if !isOpen {
					errorClosed = true
					continue
				}

				shouldFlush := storeBatch.add(incomingError)
				if shouldFlush {
					err := storeBatch.flush(ctx, manager.Pool)
					if err != nil {
						manager.Errors = append(
							manager.Errors,
							err,
						)
					}
				}
			}
		}
	}()

	// Flush the remaining output data in the batch, if present
	if len(storeBatch.Outputs) > 0 {
		err := storeBatch.flush(ctx, manager.Pool)
		if err != nil {
			manager.Errors = append(
				manager.Errors,
				err,
			)
		}
	}

	if len(manager.Errors) > 0 {
		for _, err := range manager.Errors {
			logger.Error("StoreManager error", "error", err)
		}
	}

	logger.Warn("StoreManager exited")
}

func (manager *ErrorManager) RunWorkers(ctx context.Context) {
	var wg = sync.WaitGroup{}

	// Span a new goroutine for each worker.
	// Each of these goroutines will run a for-select
	// loop on the channels, exiting only when the right
	// conditions have been met.
	for i := 0; i < manager.NumWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case incomingError, isOpen := <-manager.Input:
					if !isOpen {
						// The input channel has closed, so we
						// can exit
						return
					}

					// Now we process the incoming error
					// by creating an Output struct with the error object attached
					output := &Output{
						WFO:       incomingError.WFO,
						HasErrors: true,
						Errors:    incomingError,
					}
					select {
					case <-ctx.Done():
						return
					case manager.Output <- output:
					}
				}
			}
		}(i)
	}

	wg.Wait()
	close(manager.Output)
	logger.Warn("ErrorManager exited")
}

/**
* Creates a new GHWO pipeline configured with all the
* correct managers linked together.
* We pass in the db pool instance, which will then be set on
* the StoreManager.
 */
func NewPipeline(pool *pgxpool.Pool) *Pipeline {
	errorChan := make(chan *GHWOError)
	extractionManager := &ExtractionManager{
		Input:     make(chan string),
		Output:    make(chan *FetchResult),
		ErrorChan: errorChan,
	}
	extractionManager.setNumWorkers()
	transformManager := &TransformManager{
		Input:     extractionManager.Output,
		Output:    make(chan *LocalityResult),
		ErrorChan: errorChan,
	}
	transformManager.setNumWorkers()
	transformLocalityManager := &TransformLocalityManager{
		Input:     transformManager.Output,
		Output:    make(chan *Output),
		ErrorChan: errorChan,
	}
	transformLocalityManager.setNumWorkers()
	storeManager := &StoreManager{
		Input:      transformLocalityManager.Output,
		Pool:       pool,
		ErrorChan:  make(chan *Output),
		StoreBatch: NewBatch(40),
	}

	errorManager := &ErrorManager{
		Input:  errorChan,
		Output: storeManager.ErrorChan,
	}
	errorManager.setNumWorkers()

	return &Pipeline{
		Managers: []WorkerRunner{
			extractionManager,
			transformManager,
			transformLocalityManager,
			storeManager,
			errorManager,
		},
		ErrorChan: errorChan,
	}
}

/**
* Top level function for handling all pre-run Pipeline
* setup.
 */
func (pipeline *Pipeline) Initialize(ctx context.Context) error {
	// We want to grab the StoreManager and initialize the swap tables
	storeManager := pipeline.Managers[3].(*StoreManager)
	err := storeManager.StoreBatch.createStagingTables(ctx, storeManager.Pool)
	if err != nil {
		return err
	}

	return nil
}

/**
* Top level function to run the given pipeline.
* Iterates through each Manager and runs its own workers
* as a separate goroutine, waiting for them all to finish.
 */
func (pipeline *Pipeline) Run(ctx context.Context) {
	var wg = sync.WaitGroup{}

	for i := 0; i < len(pipeline.Managers); i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			pipeline.Managers[i].RunWorkers(ctx)
		}()
	}

	wg.Wait()
}

/**
* Top level function that handles finalization of a pipeline
 */
func (pipeline *Pipeline) Finalize(ctx context.Context) error {
	// Finalize the StoreManager by swapping the tables.
	// The StoreManager will have been writing to a staging table
	// (see the SwapTables interface definition and components),
	// and will need to "swap in" the staging for the live tables, for
	// each of the risk data and risk wfo error tables
	storeManager := pipeline.Managers[3].(*StoreManager)

	// Swap the risk data staging table in as live data
	err := storeManager.StoreBatch.riskSwapData.Swap(
		ctx,
		storeManager.Pool,
	)
	if err != nil {
		return err
	}

	// Swap the risk wfo errors staging table in as live data
	err = storeManager.StoreBatch.errorSwapData.Swap(
		ctx,
		storeManager.Pool,
	)
	if err != nil {
		return err
	}

	return nil
}
