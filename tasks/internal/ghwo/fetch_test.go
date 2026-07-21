package ghwo

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"os"
	"reflect"
	"strings"
	"testing"
)

// Implement the RoundTripper interface, so we can override
// http.Client.Transport in our mocked clients
type RoundTripFunc func(req *http.Request) (*http.Response, error)

func (f RoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

// Implement the ReadCloser interface

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

func TestStateFetch(t *testing.T) {
	exampleChickletBytes, err := os.ReadFile("./test_data/LWX_chickletMaryland.json")
	if err != nil {
		t.Errorf("Error opening test state chicklet: %s", err)
	}
	exampleLegendBytes, err := os.ReadFile("./test_data/LWX_legendMaryland.json")
	if err != nil {
		t.Errorf("Error openint test state legend: %s", err)
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

			t.Run("Can fetch a state chicklet", func(t *testing.T) {
				fetcher := StateFetch{
					WFO:          "LWX",
					StateCode:    "MD",
					ResourceType: ChickletResource,
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
				if !reflect.DeepEqual(fetcher.ResponseBytes, exampleChickletBytes) {
					t.Errorf("StateFetch does not have the expected chicklet response bytes")
				}
			})

			t.Run("Can fetch a state legend", func(t *testing.T) {
				fetcher := StateFetch{
					WFO:          "LWX",
					StateCode:    "MD",
					ResourceType: LegendResource,
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
				if !reflect.DeepEqual(fetcher.ResponseBytes, exampleLegendBytes) {
					t.Errorf("StateFetch does not have the expected chicklet response bytes")
				}
			})

		})
	})
}
