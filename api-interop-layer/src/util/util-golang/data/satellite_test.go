package data

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	util_golang "weathergov/util-golang"
)

func TestGetSatellite(t *testing.T) {
	// Mock API
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/WFO/catalogs/WFO_02_okc_catalog.json" {
			fmt.Fprintln(w, `{
				"meta": {
					"satellite": "GOES-East",
					"observation_time": "2023-10-27T12:00:00Z"
				}
			}`)
			return
		}
		w.WriteHeader(404)
	}))
	defer ts.Close()

	// How to intercept fetch?
	// FetchAPIJson uses internalFetch -> HTTPClient.
	// But satellite.go calls util_golang.FetchAPIJson with full URL "https://cdn..."
	// Need to intercept fetching of that specific host...
	// util_golang.BaseURL is only used for relative paths!
	// FetchAPIJson uses `http.NewRequest("GET", u.String(), nil)`.
	// We can modify `util_golang.HTTPClient.Transport` to intercept?
	// Or we can modify the code to check for an override base URL for NESDIS?
	// OR, we can't easily test full URLs with `httptest` without some hack like DNS or Transport hijacking.
	// But `util_golang.HTTPClient` is exported. We can replace it!

	// Create a custom Transport that redirects requests
	// But the request URL is absolute.
	// A custom Transport RoundTrip can inspect request, change URL to test server.

	originalClient := util_golang.HTTPClient

	util_golang.HTTPClient = &http.Client{
		Transport: &testTransport{
			Transport: http.DefaultTransport,
			TargetURL: ts.URL,
		},
	}
	defer func() { util_golang.HTTPClient = originalClient }()

	grid := &Grid{WFO: "OKC"}
	place := &Place{Timezone: "America/Chicago"}

	res, err := GetSatellite(grid, place)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.Error {
		t.Fatalf("unexpected error flag")
	}

	if res.MP4 == "" {
		t.Errorf("expected MP4 link")
	}
	// Verify satellite name logic (GOES-East -> GOES19)
	expectedGIF := "https://cdn.star.nesdis.noaa.gov/WFO/okc/GEOCOLOR/GOES19-OKC-GEOCOLOR-600x600.gif"
	if res.GIF != expectedGIF {
		t.Errorf("expected GIF %s, got %s", expectedGIF, res.GIF)
	}

	// Verify time calc: 12:00 UTC - 8h = 04:00 UTC.
	// In Chicago (CDT? Oct 27 is usually DST). UTC-5.
	// 04:00 UTC = 23:00 prev day CDT.

	// Just check not empty for now, assuming timezone conversion tests cover accuracy.
	if res.Times.Start == "" {
		t.Errorf("expected start time")
	}
}

type testTransport struct {
	Transport http.RoundTripper
	TargetURL string
}

func (t *testTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Rewrite request to go to TargetURL
	if req.URL.Host == "cdn.star.nesdis.noaa.gov" || req.URL.Host == "opengeo.ncep.noaa.gov" || req.URL.Host == "api.weather.gov" {
		// Replace scheme/host/port with TargetURL
		// TargetURL e.g. "http://127.0.0.1:12345"
		// We need to keep path.

		// Simple approach: modify req.URL
		// Note: RoundTrip should not modify req, so copy.
		newReq := *req
		newReq.URL.Scheme = "http"
		newReq.URL.Host = t.TargetURL[7:] // strip http://
		// Wait, ts.URL gives http://ip:port.
		// httptest server listens on that.
		// We set req.URL to full URL of test server + original path.

		u := fmt.Sprintf("%s%s", t.TargetURL, req.URL.Path)
		newReq2, _ := http.NewRequest(req.Method, u, req.Body)
		return http.DefaultTransport.RoundTrip(newReq2)
	}
	return http.DefaultTransport.RoundTrip(req)
}
