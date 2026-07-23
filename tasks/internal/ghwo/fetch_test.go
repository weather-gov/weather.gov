package ghwo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

// Implement the RoundTripper interface, so we can override
// http.Client.Transport in our mocked clients
type RoundTripFunc func(req *http.Request) (*http.Response, error)

func (f RoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func GetMockClient(f RoundTripFunc) *http.Client {
	return &http.Client{
		Transport: f,
	}
}

// Create a ReadCloser on an array of bytes.
// This is used to put arbitrary arrays of byte data on
// mocked http.Response structs
func getReadCloserForBytes(byteData []byte) io.ReadCloser {
	return io.NopCloser(bytes.NewBuffer(byteData))
}

func TestGenericFetchMethods(t *testing.T) {
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

	var ctx = context.TODO()

	var resourceTypeLookup = map[int]string{
		GHWOResource:     "hazByCounty",
		LegendResource:   "legend",
		ChickletResource: "chicklet",
	}

	var expectedResponseBytesLookup = map[int][]byte{
		GHWOResource:     exampleGHWOBytes,
		ChickletResource: exampleChickletBytes,
		LegendResource:   exampleLegendBytes,
	}

	t.Run("GenericFetch and method tests", func(t *testing.T) {
		t.Run("fetch method on GenericFetch", func(t *testing.T) {
			mockClient := GetMockClient(func(req *http.Request) (*http.Response, error) {
				resp := &http.Response{
					StatusCode: 200,
					Status:     "Success",
					Request:    req,
				}

				if strings.HasSuffix(req.URL.Path, "chicklet.json") {
					resp.Body = getReadCloserForBytes(exampleChickletBytes)
				} else if strings.HasSuffix(req.URL.Path, "legend.json") {
					resp.Body = getReadCloserForBytes(exampleLegendBytes)
				} else if strings.HasSuffix(req.URL.Path, "hazByCounty.json") {
					resp.Body = getReadCloserForBytes(exampleGHWOBytes)
				} else {
					resp.StatusCode = 404
					resp.Status = "Not Found"
				}

				return resp, nil
			})

			// We run these tests for each of the resource types
			for resourceType, resourceString := range resourceTypeLookup {
				t.Run(fmt.Sprintf("Can fetch a WFO %s", resourceString), func(t *testing.T) {
					fetcher := GenericFetch{
						WFO:          "LWX",
						ResourceType: resourceType,
						Client:       mockClient,
					}

					responseChan := make(chan *GenericFetch)

					expectedBytes, _ := expectedResponseBytesLookup[resourceType]

					go fetcher.fetch(ctx, responseChan)
					<-responseChan

					if fetcher.Error != nil {
						t.Errorf("Fetcher responded with an error: %s", fetcher.Error)
					}
					if fetcher.Status != 200 {
						t.Errorf("Expected GenericFetch to have status code 200, but got %d", fetcher.Status)
					}
					if !reflect.DeepEqual(fetcher.ResponseBytes, expectedBytes) {
						t.Errorf("GenericFetch does not have the expected response bytes")
					}
				})

				t.Run(fmt.Sprintf("An HTTP response that is an error in the WFO %s fetch propagates to the result", resourceString), func(t *testing.T) {
					mockClient := GetMockClient(func(req *http.Request) (*http.Response, error) {
						resp := &http.Response{
							StatusCode: 499,
							Status:     "Something really bad happened!",
							Request:    req,
						}

						return resp, nil
					})

					fetcher := GenericFetch{
						WFO:          "LWX",
						ResourceType: resourceType,
						Client:       mockClient,
					}

					responseChan := make(chan *GenericFetch)

					go fetcher.fetch(ctx, responseChan)
					<-responseChan

					errMessages := make([]string, 0)
					if fetcher.Status != 499 {
						errMessages = append(
							errMessages,
							fmt.Sprintf("Expected Status to equal 499, but got: %d", fetcher.Status),
						)
					}
					if fetcher.Error == nil {
						errMessages = append(
							errMessages,
							fmt.Sprintf("Expected fetcher to have error, but instead received nil"),
						)
					}

					if len(errMessages) > 0 {
						t.Errorf("Errors: %s", strings.Join(errMessages, "\t\n"))
					}
				})

				t.Run(fmt.Sprintf("An actual error in the http request (not related to status code) in WFO %s fetch propagates to the result", resourceString), func(t *testing.T) {
					mockClient := GetMockClient(func(req *http.Request) (*http.Response, error) {
						resp := &http.Response{}

						return resp, fmt.Errorf("%s", "Some kind of error!")
					})

					fetcher := GenericFetch{
						WFO:          "LWX",
						ResourceType: resourceType,
						Client:       mockClient,
					}

					responseChan := make(chan *GenericFetch)

					go fetcher.fetch(ctx, responseChan)
					<-responseChan

					if fetcher.Error == nil {
						t.Errorf("Expected an error but got nil")
					}
				})
			}
		})
	})
}

func TestStateFetchMethods(t *testing.T) {
	exampleChickletBytes, err := os.ReadFile("./test_data/LWX_chickletMaryland.json")
	if err != nil {
		t.Errorf("Error opening test state chicklet: %s", err)
	}
	exampleLegendBytes, err := os.ReadFile("./test_data/LWX_legendMaryland.json")
	if err != nil {
		t.Errorf("Error openint test state legend: %s", err)
	}

	var expectedBytesLookup = map[int][]byte{
		ChickletResource: exampleChickletBytes,
		LegendResource:   exampleLegendBytes,
	}

	var resourceTypeLookup = map[int]string{
		ChickletResource: "chicklet",
		LegendResource:   "legend",
	}

	var ctx = context.TODO()

	t.Run("StateFetch and method tests", func(t *testing.T) {

		t.Run("fetch method on StateFetch", func(t *testing.T) {
			mockClient := GetMockClient(func(req *http.Request) (*http.Response, error) {
				resp := &http.Response{
					StatusCode: 200,
					Status:     "Success",
					Request:    req,
				}

				if strings.HasSuffix(req.URL.Path, "chickletMaryland.json") {
					resp.Body = getReadCloserForBytes(exampleChickletBytes)
				} else if strings.HasSuffix(req.URL.Path, "legendMaryland.json") {
					resp.Body = getReadCloserForBytes(exampleLegendBytes)
				} else {
					resp.StatusCode = 404
					resp.Status = "Not Found"
				}

				return resp, nil
			})

			// We run each of these tests for every resourceType
			for resourceType, resourceLabel := range resourceTypeLookup {
				t.Run(fmt.Sprintf("Can fetch a state %s", resourceLabel), func(t *testing.T) {
					fetcher := StateFetch{
						WFO:          "LWX",
						StateCode:    "MD",
						ResourceType: resourceType,
						Client:       mockClient,
					}

					responseChan := make(chan *StateFetch)

					// Call the fetch as a goroutine, and wait on the
					// channel for the response
					go fetcher.fetch(ctx, responseChan)
					<-responseChan

					if fetcher.Error != nil {
						t.Errorf("Fetcher on chicklet responded with an error: %s", fetcher.Error)
					}
					if fetcher.Status != 200 {
						t.Errorf("Expected StateFetch to have status code 200, but got %d", fetcher.Status)
					}
					expectedBytes, _ := expectedBytesLookup[resourceType]
					if !reflect.DeepEqual(fetcher.ResponseBytes, expectedBytes) {
						t.Errorf("StateFetch does not have the expected chicklet response bytes")
					}
				})

				t.Run(fmt.Sprintf("An HTTP response that is an error in the State %s fetch propagates to the result", resourceLabel), func(t *testing.T) {
					mockClient := GetMockClient(func(req *http.Request) (*http.Response, error) {
						resp := &http.Response{
							StatusCode: 499,
							Status:     "Somethign really bad happened!",
							Request:    req,
						}

						return resp, nil
					})

					fetcher := StateFetch{
						WFO:          "LWX",
						StateCode:    "MD",
						ResourceType: resourceType,
						Client:       mockClient,
					}

					responseChan := make(chan *StateFetch)

					// Call the fetch as a goroutine, and wait on the
					// channel for the response
					go fetcher.fetch(ctx, responseChan)
					<-responseChan

					errMessages := make([]string, 0)
					if fetcher.Status != 499 {
						errMessages = append(
							errMessages,
							fmt.Sprintf("Expected Status to equal 499, but got: %d", fetcher.Status),
						)
					}
					if fetcher.Error == nil {
						errMessages = append(
							errMessages,
							fmt.Sprintf("Expected fether to have error, but instead received nil"),
						)
					}

					if len(errMessages) > 0 {
						t.Errorf("Errors: %s", strings.Join(errMessages, "\n"))
					}
				})

				t.Run(fmt.Sprintf("An actual error in the http request (not related to status code) in state %s fetch propagages to the result", resourceLabel), func(t *testing.T) {
					mockClient := GetMockClient(func(req *http.Request) (*http.Response, error) {
						resp := &http.Response{}
						return resp, fmt.Errorf("%s", "Some kind of error!")
					})

					fetcher := StateFetch{
						WFO:          "LWX",
						StateCode:    "MD",
						ResourceType: resourceType,
						Client:       mockClient,
					}

					responseChan := make(chan *StateFetch)

					go fetcher.fetch(ctx, responseChan)
					<-responseChan

					if fetcher.Error == nil {
						t.Errorf("Expected an error but got nil")
					}
				})
			}

		})
	})
}

func TestFetchState(t *testing.T) {
	var ctx = context.TODO()
	exampleChickletBytes, err := os.ReadFile("./test_data/LWX_chickletMaryland.json")
	if err != nil {
		t.Errorf("Error opening test state chicklet: %s", err)
	}
	exampleLegendBytes, err := os.ReadFile("./test_data/LWX_legendMaryland.json")
	if err != nil {
		t.Errorf("Error openint test state legend: %s", err)
	}

	var exampleLegend SourceLegend
	var exampleChicklet SourceChicklet
	_ = json.Unmarshal(exampleLegendBytes, &exampleLegend)
	_ = json.Unmarshal(exampleChickletBytes, &exampleChicklet)

	/**
	* Tests of the actual FetchState() function.
	* Unlike the method tests, we cannot pass an http.Client
	* to mock.
	* Therefore we need to set up the built-in test server to intercept
	* all responses to the given endpoint.
	 */
	t.Run("makes requests for both the chicklet and legend endpoints for the state", func(t *testing.T) {
		var endpointsCalled = make([]string, 0)
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {
			// Add the incoming path to the list of endpoints that have been called
			endpointsCalled = append(
				endpointsCalled,
				req.URL.Path,
			)

			writer.WriteHeader(201)
		}))

		// Stash the global BaseURL and restore it at the
		// end of the test.
		// Then, set it to be the test server's base url
		stashedBaseURL := BaseURL
		defer func() { BaseURL = stashedBaseURL }()
		BaseURL = server.URL
		defer server.Close()

		responseChan := make(chan *StateFetchResult)
		go FetchState(ctx, "MD", "LWX", responseChan)
		<-responseChan

		if len(endpointsCalled) == 0 {
			t.Errorf("did not call any endpoints")
		}

		expectedChickletPath := "/source/lwx/ghwo/chickletMaryland.json"
		expectedLegendPath := "/source/lwx/ghwo/legendMaryland.json"

		if !slices.Contains(endpointsCalled, expectedChickletPath) {
			t.Errorf("Did not call the expected chicklet endpoint: %s (base %s)", expectedChickletPath, server.URL)
		}
		if !slices.Contains(endpointsCalled, expectedLegendPath) {
			t.Errorf("Did not call the expected legend endpoint: %s (base %s)", expectedLegendPath, server.URL)
		}
	})

	t.Run("cancelling the context will propagate errors to the response StateFetchResult", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {

			// Let's wait 2 seconds in the response.
			// We actually shouldn't end up waiting, because the context
			// should immediately cancel, which will bail.
			time.Sleep(2 * time.Second)
			writer.WriteHeader(201)
		}))

		// Stash the global BaseURL and restore it at the
		// end of the test.
		// Then, set it to be the test server's base url
		stashedBaseURL := BaseURL
		defer func() { BaseURL = stashedBaseURL }()
		BaseURL = server.URL
		defer server.Close()

		// We will be passing in a new context with a cancellation
		cancelCtx, cancelFunc := context.WithCancel(context.TODO())

		responseChan := make(chan *StateFetchResult)
		go FetchState(cancelCtx, "MD", "LWX", responseChan)

		// Immediately cancel
		cancelFunc()

		result := <-responseChan

		if len(result.Errors) != 1 {
			t.Errorf(
				"Expected 1 error, but got %d errors (%v)",
				len(result.Errors),
				result.Errors,
			)
		}

		// There should be exactly 1 error and it should be the context cancellation
		if result.Errors[0] != context.Canceled {
			t.Errorf("Expected context.Canceled error, but got: %s", result.Errors[0])
		}
	})

	t.Run("fetches all the resources for a state based on a full example", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {
			if strings.HasSuffix(req.URL.Path, "legendMaryland.json") {
				writer.Write(exampleLegendBytes)
			} else if strings.HasSuffix(req.URL.Path, "chickletMaryland.json") {
				writer.Write(exampleChickletBytes)
			} else {
				writer.WriteHeader(404)
				return
			}

			writer.WriteHeader(200)
		}))

		// Stash the global BaseURL and restore it at the
		// end of the test.
		// Then, set it to be the test server's base url
		stashedBaseURL := BaseURL
		defer func() { BaseURL = stashedBaseURL }()
		BaseURL = server.URL
		defer server.Close()

		expected := &StateFetchResult{
			StateCode: "MD",
			Legend:    &exampleLegend,
			Chicklet:  &exampleChicklet,
		}

		responseChan := make(chan *StateFetchResult)

		go FetchState(ctx, "MD", "LWX", responseChan)
		result := <-responseChan

		if !reflect.DeepEqual(result, expected) {
			t.Errorf("Expected %v to equal %v", result, expected)
		}
	})
}

func TestFetchWFO(t *testing.T) {
	var ctx = context.TODO()

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

	var exampleLegend, exampleStateLegend *SourceLegend
	var exampleChicklet, exampleStateChicklet *SourceChicklet
	var exampleGHWO *SourceGHWOData
	_ = json.Unmarshal(exampleLegendBytes, &exampleLegend)
	_ = json.Unmarshal(exampleChickletBytes, &exampleChicklet)
	_ = json.Unmarshal(exampleGHWOBytes, &exampleGHWO)
	_ = json.Unmarshal(exampleStateChickletBytes, &exampleStateChicklet)
	_ = json.Unmarshal(exampleStateLegendBytes, &exampleStateLegend)

	/**
	* Tests of the actual FetchWFO() function.
	* Unlike the individual method tests, we cannot pass
	* an http.Client mock
	* Therefore we need to set up the built-in test server to
	* intercept all responses to the given endpoint(s)
	 */
	t.Run("makes requests for all resource types (excluding state calls)", func(t *testing.T) {
		var endpointsCalled = make([]string, 0)
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {
			endpointsCalled = append(
				endpointsCalled,
				req.URL.Path,
			)

			writer.WriteHeader(200)
		}))

		// Stash the global BaseURL and restore it at the
		// end of the test.
		// Then, set it to be the test server's base url
		stashedBaseURL := BaseURL
		defer func() { BaseURL = stashedBaseURL }()
		BaseURL = server.URL
		defer server.Close()

		responseChan := make(chan *FetchResult)

		expected := []string{
			"/source/lwx/ghwo/hazByCounty.json",
			"/source/lwx/ghwo/legend.json",
			"/source/lwx/ghwo/chicklet.json",
		}

		wg := sync.WaitGroup{}

		wg.Add(1)
		go FetchWFO(ctx, "LWX", responseChan, &wg)
		<-responseChan

		// Ensure that all the expected endpoints were called
		for _, path := range expected {
			if !slices.Contains(endpointsCalled, path) {
				t.Errorf("Expected endpoint to have been called, but it wasn't: %s", path)
			}
		}

		// Make sure only those endpoints were called
		if len(endpointsCalled) != len(expected) {
			t.Errorf(
				"Expected %d endpoints to be called, but got %d: %v",
				len(expected),
				len(endpointsCalled),
				endpointsCalled,
			)
		}
	})

	t.Run("cancelling the context will propagate errors to the response FetchResult", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, req *http.Request) {
			// Wait for 2 second on any given endpoint.
			time.Sleep(2 * time.Second)
			writer.WriteHeader(201)
		}))

		// Stash the global BaseURL and restore it at the
		// end of the test.
		// Then, set it to be the test server's base url
		stashedBaseURL := BaseURL
		defer func() { BaseURL = stashedBaseURL }()
		BaseURL = server.URL
		defer server.Close()

		wg := sync.WaitGroup{}

		cancelContext, cancelFun := context.WithCancel(context.TODO())

		responseChan := make(chan *FetchResult)

		wg.Add(1)
		go FetchWFO(cancelContext, "LWX", responseChan, &wg)
		// Now immediately cancel while the server is responding to any requests
		cancelFun()
		result := <-responseChan

		if len(result.Errors) != 1 {
			t.Errorf("Expected FetchResult to have exactly 1 error, but got %d", len(result.Errors))
		}
		if result.Errors[0] != context.Canceled {
			t.Errorf("Expected error to be a context.Canceled, but got %v", result.Errors[0])
		}
	})

	t.Run("fetches all of the resources for a WFO (including all corresponding states) based on example data", func(t *testing.T) {
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

		// Stash the global BaseURL and restore it at the
		// end of the test.
		// Then, set it to be the test server's base url
		stashedBaseURL := BaseURL
		defer func() { BaseURL = stashedBaseURL }()
		BaseURL = server.URL
		defer server.Close()

		expected := &FetchResult{
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

		wg := sync.WaitGroup{}
		responseChan := make(chan *FetchResult)

		wg.Add(1)
		go FetchWFO(ctx, "LWX", responseChan, &wg)
		result := <-responseChan

		if !reflect.DeepEqual(result, expected) {
			resultStr, _ := json.MarshalIndent(result, "", "  ")
			expectedStr, _ := json.MarshalIndent(expected, "", "  ")
			t.Errorf("Expected %s to equal %s", resultStr, expectedStr)
		}
	})
}
