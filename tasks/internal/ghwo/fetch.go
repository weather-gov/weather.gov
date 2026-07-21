package ghwo

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"tasks/internal"
)

// Constants representing the different ghwo source
// resource types.
// These will be used in part to determine which
// endpoints to request data from.
const (
	GHWOResource = iota
	LegendResource
	ChickletResource
)

var logger = internal.GetDefaultLogger()

// We use a single preconfigured http.Client
// instance. See `http_client.go`
var defaultClient = GHWOClient

/**
* Struct representing the results of an overall data fetch
* for WFO level GHWO data.
* This type of struct is what gets sent on the channel
* that is passed to FetchWFO.
 */
type FetchResult struct {
	WFO      string
	Errors   []error
	GHWOData *SourceGHWOData
	Legend   *SourceLegend
	Chicklet *SourceChicklet
	States   map[LocalityCode]*StateFetchResult
}

/**
* Struct representing the results of a data fetch
* for ghwo data for a specific state.
* This type of struct is what gets sent on the channel
* that is passed to FetchState()
 */
type StateFetchResult struct {
	StateCode LocalityCode
	Errors    []error
	Legend    *SourceLegend
	Chicklet  *SourceChicklet
}

/**
* Struct representing the configuration needed for
* fetching WFO level GHWO data.
* Implements both the getURL() and fetch()
* methods.
 */
type GenericFetch struct {
	WFO           string
	ResourceType  int
	ResponseBytes []byte
	Error         error
	Status        int
	Client        *http.Client
}

/**
* Struct representing the configuration needed for
* fetching individual state level GHWO data.
* Implements its own getURL() and fetch() methods
 */
type StateFetch struct {
	WFO           string
	StateCode     LocalityCode
	ResourceType  int
	ResponseBytes []byte
	Error         error
	Status        int
	Client        *http.Client
}

/**
* Method for determining which URL maps to which
* WFO level GHWO ResourceType
 */
func (d *GenericFetch) getURL() string {
	switch resourceType := d.ResourceType; resourceType {
	case GHWOResource:
		return fmt.Sprintf("https://www.weather.gov/source/%s/ghwo/hazByCounty.json", strings.ToLower(d.WFO))
	case ChickletResource:
		return fmt.Sprintf("https://www.weather.gov/source/%s/ghwo/chicklet.json", strings.ToLower(d.WFO))
	case LegendResource:
		return fmt.Sprintf("https://www.weather.gov/source/%s/ghwo/legend.json", strings.ToLower(d.WFO))
	default:
		return ""
	}
}

/**
* Method for determining which URL maps to which
* state level GHWO ResourceType.
* In this case, we need to use the extra state abbrev to
* resource name mapping that is particular to the messy
* state GHWO structure.
* Note that unlike the WFO level version of this method,
* there are only 2 resource types
 */
func (d *StateFetch) getURL() string {
	// First, we need to find a mapping between the given state and the
	// format that it uses for state level ghwo data files.
	// For example, Maryland uses "MarylandChicklet.json"
	// while South Dakota uses "South_DakotaChicklet.json"
	// (among other state variations)
	viewName := GetStateDataViewName(d.StateCode)
	if viewName == "" {
		return ""
	}

	switch resourceType := d.ResourceType; resourceType {
	case ChickletResource:
		return fmt.Sprintf(
			"https://www.weather.gov/source/%s/ghwo/chicklet%s.json",
			strings.ToLower(d.WFO),
			viewName,
		)
	case LegendResource:
		return fmt.Sprintf(
			"https://www.weather.gov/source/%s/ghwo/legend%s.json",
			strings.ToLower(d.WFO),
			viewName,
		)
	default:
		return ""
	}
}

/**
* Makes the http call to get WFO level ghwo data from a
* specific endpoint based on ResourceType.
* The endpoint will be a hazbycounty, legend, or chicklet.
* The GenericFetch configuration it is called on will be sent on
* the passed-in response channel once it has been updated
 */
func (d *GenericFetch) fetch(ctx context.Context, ch chan *GenericFetch) {
	url := d.getURL()
	if url == "" {
		d.Error = fmt.Errorf("Invalid URL for ResourceType %d: %s", d.ResourceType, url)
		ch <- d
		return
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		d.Error = err
		ch <- d
		return
	}

	logger.Info(fmt.Sprintf("Fetching %s", url), "url", url)
	response, err := d.Client.Do(req)
	if err != nil {
		d.Error = err
		ch <- d
		return
	}
	d.Status = response.StatusCode

	defer response.Body.Close()

	// Trigger an error based on the status code
	if response.StatusCode >= 400 {
		d.Error = fmt.Errorf("HTTP Error Response %d: %s (%s)", response.StatusCode, response.Status, url)
		ch <- d
		return
	}

	// Otherwise, attempt to read the body
	bytes, err := io.ReadAll(response.Body)
	if err != nil {
		d.Error = err
		ch <- d
		return
	}
	d.ResponseBytes = bytes
	ch <- d
	return

}

/**
* Makes an http request to a specific state level endpoint,
* based on ResourceType.
* Sends the source StateFetch configuration to the passed-in
* response channel once the request errors or finishes
 */
func (d *StateFetch) fetch(ctx context.Context, ch chan *StateFetch) {
	url := d.getURL()
	if url == "" {
		d.Error = fmt.Errorf("Empty or invalid url for state %s (%s)", d.StateCode, url)
		ch <- d
		return
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		d.Error = err
		ch <- d
		return
	}

	logger.Info(fmt.Sprintf("Fetching state data %s", url), "url", url)
	response, err := d.Client.Do(req)
	if err != nil {
		d.Error = err
		ch <- d
		return
	}
	d.Status = response.StatusCode

	defer response.Body.Close()

	if response.StatusCode >= 400 {
		d.Error = fmt.Errorf("HTTP Error Response %d: %s (%s)", response.StatusCode, response.Status, url)
		ch <- d
		return
	}

	// Otherwise attempt to read the body
	bytes, err := io.ReadAll(response.Body)
	if err != nil {
		d.Error = err
		ch <- d
		return
	}
	d.ResponseBytes = bytes
	ch <- d
	return
}

/**
* Handles the requesting of all constituent requests needed to get GHWO  data
* at the WFO level.
* This includes subsequent requests for all state level data for each state, should
* the initial data have state information.
* All requests are processed as goroutines tracked by a single working group.
* When complete, a FetchResult will be send on the channel that was passed in as
* an argument.
 */
func FetchWFO(ctx context.Context, sourceWFO string, ch chan *FetchResult, group *sync.WaitGroup) {
	defer group.Done()
	var wfo = strings.ToLower(sourceWFO)
	var result = &FetchResult{
		WFO: wfo,
	}
	var resources = []int{
		GHWOResource,
		ChickletResource,
		LegendResource,
	}

	// Output channel for http responses
	responseChan := make(chan *GenericFetch, 3)

	// Start a fetch worker for each resource type
	for _, resource := range resources {
		fetchData := GenericFetch{
			WFO:          wfo,
			ResourceType: resource,
			Client:       defaultClient,
		}
		go fetchData.fetch(ctx, responseChan)
	}

	// Loop through the response objects.
	// If there are any errors, append to the
	// result errors list.
	// Otherwise, we need to attempt to marshal the responses
	// into their appropriate structs
	for i := 0; i < len(resources); i++ {
		select {
		case response := <-responseChan:
			responseBytesToStructs(response, result)
		case <-ctx.Done():
			result.Errors = append(
				result.Errors,
				ctx.Err(),
			)
			ch <- result
			close(responseChan)
			return
		}
	}
	close(responseChan)

	// If there are any errors, add them to the result
	// object and send it on the channel, then bail
	if len(result.Errors) > 0 {
		ch <- result
		return
	}

	// If there are states, spin up a worker to get
	// the data for each state
	var numStates = len(result.GHWOData.States)
	if numStates > 0 {
		result.States = make(map[LocalityCode]*StateFetchResult)
		stateResponseChan := make(chan *StateFetchResult, numStates)
		for stateCode, _ := range result.GHWOData.States {
			go FetchState(ctx, stateCode, wfo, stateResponseChan)
		}

		for i := 0; i < numStates; i++ {
			select {
			case stateResponse := <-stateResponseChan:
				result.States[stateResponse.StateCode] = stateResponse
			case <-ctx.Done():
				result.Errors = append(
					result.Errors,
					ctx.Err(),
				)
				ch <- result
				close(stateResponseChan)
				return
			}
		}
		close(stateResponseChan)
	}

	ch <- result
}

/**
* Add information from the individual fetch response to the overall
* fetch result struct. This includes appending any errors, as well as
* attempting to unmarshal the raw bytes into the appropriate struct
* for the individual fetchData's resource type
 */
func responseBytesToStructs(fetchData *GenericFetch, result *FetchResult) {
	if fetchData.Error != nil {
		result.Errors = append(result.Errors, fetchData.Error)
		return
	}

	// Switch based on the resource type and create a new
	// corresponding struct
	switch resourceType := fetchData.ResourceType; resourceType {
	case GHWOResource:
		dataStruct := SourceGHWOData{}
		err := json.Unmarshal(fetchData.ResponseBytes, &dataStruct)
		if err != nil {
			result.Errors = append(result.Errors, err)
			return
		}
		result.GHWOData = &dataStruct
	case LegendResource:
		dataStruct := SourceLegend{}
		err := json.Unmarshal(fetchData.ResponseBytes, &dataStruct)
		if err != nil {
			result.Errors = append(result.Errors, err)
			return
		}
		result.Legend = &dataStruct
	case ChickletResource:
		dataStruct := SourceChicklet{}
		err := json.Unmarshal(fetchData.ResponseBytes, &dataStruct)
		if err != nil {
			result.Errors = append(result.Errors, err)
			return
		}
		result.Chicklet = &dataStruct
	default:
		return
	}
}

/**
* Handles the requesting of all requests needed to get state level
* GHWO data for an individual state.
* This function is called as a goroutine by FetchWFO, in cases where the
* initial data response indicates that there is state level data for the WFO.
* The requests are tracked as part of a single working group.
* When complete, a StateFetchResult will be sent to the channel that was
* passed in as an argument.
 */
func FetchState(ctx context.Context, stateCode string, wfo string, ch chan *StateFetchResult) {
	var result = &StateFetchResult{
		StateCode: stateCode,
	}
	var resources = []int{
		ChickletResource,
		LegendResource,
	}

	// Output channel for responses
	responseChan := make(chan *StateFetch, len(resources))

	// Start a fetch worker for each resource type
	for _, resource := range resources {
		fetchData := StateFetch{
			WFO:          wfo,
			StateCode:    stateCode,
			ResourceType: resource,
			Client:       defaultClient,
		}
		go fetchData.fetch(ctx, responseChan)
	}

	// Recieve the data on the channel
	for i := 0; i < len(resources); i++ {
		select {
		case response := <-responseChan:
			responseBytesToStateStructs(response, result)
		case <-ctx.Done():
			result.Errors = append(
				result.Errors,
				ctx.Err(),
			)
			ch <- result
			close(responseChan)
			return
		}
	}
	close(responseChan)

	ch <- result
}

/**
* Add information from the individual fetch response to the overall
* fetch result struct. This includes appending any errors, as well as
* attempting to unmarshal the raw bytes into the appropriate struct
* for the individual fetchData's resource type
 */
func responseBytesToStateStructs(fetchData *StateFetch, result *StateFetchResult) {
	if fetchData.Error != nil {
		result.Errors = append(result.Errors, fetchData.Error)
		return
	}

	// Switch based on the resource type and reate a new
	// corresponding struct for that type
	switch resourceType := fetchData.ResourceType; resourceType {
	case LegendResource:
		dataStruct := SourceLegend{}
		err := json.Unmarshal(fetchData.ResponseBytes, &dataStruct)
		if err != nil {
			result.Errors = append(result.Errors, err)
			return
		}
		result.Legend = &dataStruct
	case ChickletResource:
		dataStruct := SourceChicklet{}
		err := json.Unmarshal(fetchData.ResponseBytes, &dataStruct)
		if err != nil {
			result.Errors = append(result.Errors, err)
			return
		}
		result.Chicklet = &dataStruct
	default:
		return
	}
}
