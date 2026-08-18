package ghwo

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"slices"
	"strings"
	"sync"
	"testing"
	//	"time"
	//	"sync"
)

func TestExtractManager(t *testing.T) {
	exampleLegendBytes, err := os.ReadFile("./test_data/LWX_legend.json")
	if err != nil {
		t.Errorf("Error opening test wfo legend: %s", err)
	}
	exampleChickletBytes, err := os.ReadFile("./test_data/LWX_chicklet.json")
	if err != nil {
		t.Errorf("Error opening test wfo chicklet: %s", err)
	}
	exampleGHWOBytes, err := os.ReadFile("./test_data/LWX_hazByCounty.json")
	if err != nil {
		t.Errorf("Error opening test hazByCounty: %s", err)
	}

	exampleStateChickletBytes, err := os.ReadFile("./test_data/LWX_chickletMaryland.json")
	if err != nil {
		t.Errorf("Error opening test state chicklet: %s", err)
	}
	exampleStateLegendBytes, err := os.ReadFile("./test_data/LWX_legendMaryland.json")
	if err != nil {
		t.Errorf("Error openint test state legend: %s", err)
	}

	t.Run("ExtractWorkers are able to fetch resources (no errors)", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {
			if strings.HasSuffix(req.URL.Path, "chicklet.json") {
				writer.Write(exampleChickletBytes)
			} else if strings.HasSuffix(req.URL.Path, "legend.json") {
				writer.Write(exampleLegendBytes)
			} else if strings.HasSuffix(req.URL.Path, "hazByCounty.json") {
				writer.Write(exampleGHWOBytes)
			} else if strings.HasSuffix(req.URL.Path, "chickletMaryland.json") {
				writer.Write(exampleStateChickletBytes)
			} else if strings.HasSuffix(req.URL.Path, "legendMaryland.json") {
				writer.Write(exampleStateLegendBytes)
			} else {
				writer.WriteHeader(404)
				return
			}
		}))

		t.Setenv("GHWO_BASE_URL", server.URL)
		defer server.Close()

		// Create an example context
		ctx := context.TODO()

		// Create and start the extraction workers
		extractor := &ExtractionManager{
			Input:      make(chan string),
			Output:     make(chan *FetchResult),
			NumWorkers: 2,
		}

		go func() {
			extractor.RunWorkers(ctx)
		}()

		// Send the example input and close
		// the input channel
		go func() {
			extractor.Input <- "LWX"
			close(extractor.Input)
		}()

		// Run a synchronous for-select to gather all the
		// results
		results := make([]*FetchResult, 0)
		func() {
			for {
				select {
				case <-ctx.Done():
					t.Errorf("Context was cancelled in the extractor manager test!")
					return
				case result, isOpen := <-extractor.Output:
					if !isOpen {
						return
					}
					results = append(
						results,
						result,
					)
				}

			}
		}()

		// There should be no errors in the extraction manager
		if len(extractor.Errors) > 0 {
			t.Errorf("Extraction manager has %d errors, but expected none", len(extractor.Errors))
			t.Errorf("%v", extractor.Errors)
		}

		// There should be only one result in this example
		if len(results) != 1 {
			t.Errorf("Expected one overall resulting FetchResult, but got %d", len(results))
		}

		// We expect the result to be the equivalent of simply unmarshalling the example
		// data bytes
		var exampleLegend *SourceLegend
		err := json.Unmarshal(exampleLegendBytes, &exampleLegend)
		if err != nil {
			t.Errorf("Could not unmarshal legend")
			return
		}
		var exampleGHWOData *SourceGHWOData
		err = json.Unmarshal(exampleGHWOBytes, &exampleGHWOData)
		if err != nil {
			t.Errorf("Could not unmarshal ghwo data")
		}
		var exampleChicklet *SourceChicklet
		err = json.Unmarshal(exampleChickletBytes, &exampleChicklet)
		if err != nil {
			t.Errorf("Could not unmarshal chicklet")
		}
		var exampleStateLegend *SourceLegend
		err = json.Unmarshal(exampleStateLegendBytes, &exampleStateLegend)
		if err != nil {
			t.Errorf("Could not unmarshal state legend")
			return
		}
		var exampleStateChicklet *SourceChicklet
		err = json.Unmarshal(exampleStateChickletBytes, &exampleStateChicklet)
		if err != nil {
			t.Errorf("Could not unmarshal state chicklet")
			return
		}

		// Set the WFO on the data
		exampleGHWOData.WFO = "lwx"

		expectedFetchResult := &FetchResult{
			WFO:      "lwx",
			Legend:   exampleLegend,
			Chicklet: exampleChicklet,
			GHWOData: exampleGHWOData,
			States: map[LocalityCode]*StateFetchResult{
				"MD": &StateFetchResult{
					StateCode: "MD",
					Legend:    exampleStateLegend,
					Chicklet:  exampleStateChicklet,
				},
			},
		}

		if !reflect.DeepEqual(expectedFetchResult, results[0]) {
			t.Errorf("Expected %v to deep equal %v", results[0], expectedFetchResult)
		}
	})

	t.Run("ExtractWorkers are able to fetch WFO level resources, even when the state errors", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {
			if strings.HasSuffix(req.URL.Path, "chicklet.json") {
				writer.Write(exampleChickletBytes)
			} else if strings.HasSuffix(req.URL.Path, "legend.json") {
				writer.Write(exampleLegendBytes)
			} else if strings.HasSuffix(req.URL.Path, "hazByCounty.json") {
				writer.Write(exampleGHWOBytes)
			} else if strings.HasSuffix(req.URL.Path, "Maryland.json") {
				writer.WriteHeader(404)
				return
			} else {
				writer.WriteHeader(404)
				return
			}
		}))

		t.Setenv("GHWO_BASE_URL", server.URL)
		defer server.Close()

		// Create an example context
		ctx := context.TODO()

		// Create and start the extraction workers
		extractor := &ExtractionManager{
			Input:      make(chan string),
			Output:     make(chan *FetchResult),
			NumWorkers: 2,
		}

		go func() {
			extractor.RunWorkers(ctx)
		}()

		// Send the example input and close the
		// input channel
		go func() {
			extractor.Input <- "LWX"
			close(extractor.Input)
		}()

		// Run a synchronous for-select to gather all of
		// the results
		results := make([]*FetchResult, 0)
		func() {
			for {
				select {
				case <-ctx.Done():
					t.Error("Context was cancelled in extractor manager test!")
					return
				case result, isOpen := <-extractor.Output:
					if !isOpen {
						return
					}
					results = append(
						results,
						result,
					)
				}
			}
		}()

		// There should only be one result from this example
		if len(results) != 1 {
			t.Errorf("Expected one overall resulting FetchResult, but got %d", len(results))
		}

		// We expect the result to be the equivalent of simply unmarshalling the example
		// data bytes
		var exampleLegend *SourceLegend
		err := json.Unmarshal(exampleLegendBytes, &exampleLegend)
		if err != nil {
			t.Errorf("Could not unmarshal legend")
			return
		}
		var exampleGHWOData *SourceGHWOData
		err = json.Unmarshal(exampleGHWOBytes, &exampleGHWOData)
		if err != nil {
			t.Errorf("Could not unmarshal ghwo data")
		}
		var exampleChicklet *SourceChicklet
		err = json.Unmarshal(exampleChickletBytes, &exampleChicklet)
		if err != nil {
			t.Errorf("Could not unmarshal chicklet")
		}

		// Set the WFO on the expected data
		exampleGHWOData.WFO = "lwx"

		expectedFetchResult := &FetchResult{
			WFO:      "lwx",
			Legend:   exampleLegend,
			Chicklet: exampleChicklet,
			GHWOData: exampleGHWOData,
			// Exclude state results for now
		}

		// We expect a single state fetch result with 2 errors,
		// one for each of state chicklet and legend fetch failures
		stateResult, ok := results[0].States["MD"]
		if !ok {
			t.Errorf("Expected a state result for MD, but not found!")
			return
		}
		if len(stateResult.Errors) != 2 {
			t.Errorf("Expected 2 state result errors for MD, but got %d", len(stateResult.Errors))
		}

		// But we want the rest of the data, excluding state information, to match
		if expectedFetchResult.WFO != results[0].WFO {
			t.Errorf("Expected 'lwx' for WFO, but got %s", results[0].WFO)
		}
		if !reflect.DeepEqual(expectedFetchResult.Legend, results[0].Legend) {
			t.Errorf("Expected result to deeply equal legend %v, but got %v", expectedFetchResult.Legend, results[0].Legend)
		}
		if !reflect.DeepEqual(expectedFetchResult.Chicklet, results[0].Chicklet) {
			t.Errorf("Expected result chicklet to deeply equal %v, but got %v", expectedFetchResult.Chicklet, results[0].Chicklet)
		}
		if !reflect.DeepEqual(expectedFetchResult.GHWOData, results[0].GHWOData) {
			t.Errorf("Expected result ghwo data to deeply equal %v, but got %v", expectedFetchResult.GHWOData, results[0].GHWOData)
		}
	})
}

func TestTransformManagers(t *testing.T) {
	exampleLegendBytes, err := os.ReadFile("./test_data/LWX_legend.json")
	if err != nil {
		t.Errorf("Error opening test wfo legend: %s", err)
	}
	exampleChickletBytes, err := os.ReadFile("./test_data/LWX_chicklet.json")
	if err != nil {
		t.Errorf("Error opening test wfo chicklet: %s", err)
	}
	exampleGHWOBytes, err := os.ReadFile("./test_data/LWX_hazByCounty.json")
	if err != nil {
		t.Errorf("Error opening test hazByCounty: %s", err)
	}

	exampleStateChickletBytes, err := os.ReadFile("./test_data/LWX_chickletMaryland.json")
	if err != nil {
		t.Errorf("Error opening test state chicklet: %s", err)
	}
	exampleStateLegendBytes, err := os.ReadFile("./test_data/LWX_legendMaryland.json")
	if err != nil {
		t.Errorf("Error openint test state legend: %s", err)
	}

	// A single county output example that we can test against
	exampleCountyOutputBytes, err := os.ReadFile("./test_data/county_51013.json")
	if err != nil {
		t.Errorf("Error opening the example county chicklet: %s", err)
	}

	var exampleLegend, exampleStateLegend *SourceLegend
	var exampleChicklet, exampleStateChicklet *SourceChicklet
	var exampleGHWO *SourceGHWOData
	var exampleCountyOutput *Output
	_ = json.Unmarshal(exampleLegendBytes, &exampleLegend)
	_ = json.Unmarshal(exampleChickletBytes, &exampleChicklet)
	_ = json.Unmarshal(exampleGHWOBytes, &exampleGHWO)
	_ = json.Unmarshal(exampleStateChickletBytes, &exampleStateChicklet)
	_ = json.Unmarshal(exampleStateLegendBytes, &exampleStateLegend)
	_ = json.Unmarshal(exampleCountyOutputBytes, &exampleCountyOutput)

	var processedLegend = exampleLegend.ProcessOutputLegend()
	var processedChicklet = exampleChicklet.GetRiskToHazardLookup()

	// Source hazByCounty data does not include the WFO, so we need to add
	// that manually to the SourceGHWOData.
	// In a full pipeline, the FetchWFO would be responsible for adding this information
	exampleGHWO.WFO = "lwx"

	t.Run("TransformManager: output channel can receive the expected number of outputs before being closed", func(t *testing.T) {
		ctx := context.TODO()

		fetchResult := &FetchResult{
			WFO:      "lwx",
			GHWOData: exampleGHWO,
			Legend:   exampleLegend,
			Chicklet: exampleChicklet,
			States: map[LocalityCode]*StateFetchResult{
				"MD": &StateFetchResult{
					StateCode: "MD",
					Legend:    exampleStateLegend,
					Chicklet:  exampleStateChicklet,
				},
			},
		}

		manager := TransformManager{
			Input:      make(chan *FetchResult),
			Output:     make(chan *LocalityResult),
			NumWorkers: 1,
		}

		var results = make([]*LocalityResult, 0)

		// run the workers
		go func() {
			manager.RunWorkers(ctx)
		}()

		// send the input
		go func() {
			manager.Input <- fetchResult
			close(manager.Input)
		}()

		// Run a synchronous for-select and gather all the results
		func() {
			for {
				select {
				case <-ctx.Done():
					t.Errorf("Context was cancelled in transform manager test!")
					return
				case result, isOpen := <-manager.Output:
					if !isOpen {
						return
					}
					results = append(
						results,
						result,
					)
				}
			}
		}()

		// There should be no errors in the manager
		if len(manager.Errors) > 0 {
			t.Errorf("manager has %d errors, but expected none", len(manager.Errors))
			t.Errorf("%v", manager.Errors)
		}

		// We expect 59 counties present in the results
		expectedCounties := 59
		actualCounties := 0
		for _, output := range results {
			if output.Type == "county" {
				actualCounties += 1
			}
		}

		if actualCounties != expectedCounties {
			t.Errorf("Expected output to produce %d counties, but got %d", expectedCounties, actualCounties)
		}

		// TODO: add case for states
	})

	t.Run("TransformManager will stop the pipeline correctly when the context is cancelled", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.TODO())

		manager := TransformManager{
			Input:      make(chan *FetchResult),
			Output:     make(chan *LocalityResult),
			NumWorkers: 1,
		}

		// Run the workers
		go func() {
			manager.RunWorkers(ctx)
		}()

		// Cancel the context
		cancel()

		// ensure that cancelling closed the output
		_, outputOpen := <-manager.Output

		if outputOpen {
			t.Errorf("Cancelling did not close the output channel!")
		}
	})

	t.Run("TransformLocalityManager: output channel can receive processed output after input is closed", func(t *testing.T) {
		ctx := context.TODO()

		localityResult := &LocalityResult{
			Type:     "county",
			Code:     "51013",
			Legend:   processedLegend,
			Chicklet: processedChicklet,
			GHWOData: exampleGHWO,
		}

		manager := TransformLocalityManager{
			Input:      make(chan *LocalityResult),
			Output:     make(chan *Output),
			ErrorChan:  make(chan *GHWOError),
			NumWorkers: 1,
		}

		var results = make([]*Output, 0)

		// Run the workers
		go func() {
			manager.RunWorkers(ctx)
		}()

		// Send the input
		go func() {
			manager.Input <- localityResult
			close(manager.Input)
		}()

		// Run a synchronous for-select and gather the outputs
		func() {
			for {
				select {
				case <-ctx.Done():
					t.Errorf("Context was cancelled")
					return
				case result, isOpen := <-manager.Output:
					if !isOpen {
						return
					}
					results = append(
						results,
						result,
					)
				}
			}
		}()

		// There should be no errors in the manager
		if len(manager.Errors) > 0 {
			t.Errorf("manager has %d errors, but expected none", len(manager.Errors))
			t.Errorf("%v", manager.Errors)
		}

		if len(results) != 1 {
			t.Errorf("Expected 1 result, but got %d", len(results))
		}

		// The expected data's noRisks isn't sorted, so we need to do that
		slices.Sort(exampleCountyOutput.NoRisks)
		slices.Sort(results[0].NoRisks)

		if !reflect.DeepEqual(results[0], exampleCountyOutput) {
			actualBytes, _ := json.MarshalIndent(results[0], "", "  ")
			t.Errorf("Output does not equal the expected result!")
			t.Errorf("Expected:\n%s\nto equal:\n%s", string(actualBytes), string(exampleCountyOutputBytes))
		}
	})

}

func TestManagerIntegration(t *testing.T) {
	exampleLegendBytes, err := os.ReadFile("./test_data/LWX_legend.json")
	if err != nil {
		t.Errorf("Error opening test wfo legend: %s", err)
	}
	exampleChickletBytes, err := os.ReadFile("./test_data/LWX_chicklet.json")
	if err != nil {
		t.Errorf("Error opening test wfo chicklet: %s", err)
	}
	exampleGHWOBytes, err := os.ReadFile("./test_data/LWX_hazByCounty.json")
	if err != nil {
		t.Errorf("Error opening test hazByCounty: %s", err)
	}

	exampleStateChickletBytes, err := os.ReadFile("./test_data/LWX_chickletMaryland.json")
	if err != nil {
		t.Errorf("Error opening test state chicklet: %s", err)
	}
	exampleStateLegendBytes, err := os.ReadFile("./test_data/LWX_legendMaryland.json")
	if err != nil {
		t.Errorf("Error openint test state legend: %s", err)
	}

	// A single county output example that we can test against
	exampleCountyOutputBytes, err := os.ReadFile("./test_data/county_51013.json")
	if err != nil {
		t.Errorf("Error opening the example county chicklet: %s", err)
	}

	var exampleLegend, exampleStateLegend *SourceLegend
	var exampleChicklet, exampleStateChicklet *SourceChicklet
	var exampleGHWO *SourceGHWOData
	var exampleCountyOutput *Output
	_ = json.Unmarshal(exampleLegendBytes, &exampleLegend)
	_ = json.Unmarshal(exampleChickletBytes, &exampleChicklet)
	_ = json.Unmarshal(exampleGHWOBytes, &exampleGHWO)
	_ = json.Unmarshal(exampleStateChickletBytes, &exampleStateChicklet)
	_ = json.Unmarshal(exampleStateLegendBytes, &exampleStateLegend)
	_ = json.Unmarshal(exampleCountyOutputBytes, &exampleCountyOutput)

	// var processedLegend = exampleLegend.ProcessOutputLegend()
	// var processedChicklet = exampleChicklet.GetRiskToHazardLookup()

	// Source hazByCounty data does not include the WFO, so we need to add
	// that manually to the SourceGHWOData.
	// In a full pipeline, the FetchWFO would be responsible for adding this information
	exampleGHWO.WFO = "lwx"

	t.Run("Can pass from TransformManager to TransformLocalityManager and get output", func(t *testing.T) {
		stateResult := &StateFetchResult{
			StateCode: "MD",
			Legend:    exampleStateLegend,
			Chicklet:  exampleStateChicklet,
		}

		dataResult := &FetchResult{
			WFO:      "lwx",
			GHWOData: exampleGHWO,
			Legend:   exampleLegend,
			Chicklet: exampleChicklet,
			States: map[LocalityCode]*StateFetchResult{
				"MD": stateResult,
			},
		}

		transformManager := TransformManager{
			Input:      make(chan *FetchResult),
			Output:     make(chan *LocalityResult),
			NumWorkers: 1,
			ErrorChan:  make(chan *GHWOError),
		}
		transformLocalityManager := TransformLocalityManager{
			Input:      transformManager.Output,
			Output:     make(chan *Output),
			NumWorkers: 1,
			ErrorChan:  make(chan *GHWOError),
		}

		ctx := context.TODO()

		// Run the connected managers as a pipeline
		var wg = sync.WaitGroup{}

		wg.Add(1)
		go func() {
			defer wg.Done()
			transformManager.RunWorkers(ctx)
		}()

		wg.Add(1)
		go func() {
			defer wg.Done()
			transformLocalityManager.RunWorkers(ctx)
		}()

		// Send on the input channel and close
		transformManager.Input <- dataResult
		close(transformManager.Input)

		var outputs []*Output
		for output := range transformLocalityManager.Output {
			outputs = append(
				outputs,
				output,
			)
		}

		wg.Wait()

		if len(outputs) == 0 {
			t.Errorf("Expected many outputs, but got 0")
		}

		if len(transformManager.Errors) > 0 {
			t.Errorf("Expected 0 errors on transform manager but got %d", len(transformManager.Errors))
		}

		if len(transformLocalityManager.Errors) > 0 {
			t.Errorf("Expected 0 errors on transform locality manager but got %d", len(transformLocalityManager.Errors))
		}
	})
}
