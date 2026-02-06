package data

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	util_golang "weathergov/util-golang"
)

func TestGetRadarMetadata(t *testing.T) {
	// Mock server for WMS capabilities
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/geoserver/conus/conus_bref_qcd/ows" {
			fmt.Fprintln(w, `<WMS_Capabilities>
				<Extent name="time" default="2023-10-27T12:00:00Z">2023-10-27T11:00:00Z,2023-10-27T12:00:00Z</Extent>
			</WMS_Capabilities>`)
			return
		}
		w.WriteHeader(404)
	}))
	defer ts.Close()

	originalClient := util_golang.HTTPClient
	util_golang.HTTPClient = &http.Client{
		Transport: &testTransport{
			Transport: http.DefaultTransport,
			TargetURL: ts.URL,
		},
	}
	defer func() { util_golang.HTTPClient = originalClient }()

	place := &Place{Timezone: "UTC"}

	// Reset cache (unexported, need to reset via reflection or just sleep if logic allows... logic says > 60s)
	// Or we export a ResetRadarCache() for testing?
	// or assume it's fresh?
	// It's a package var, so it persists.
	// We can't easily reset it from outside the package unless we add a helper in the package.
	// But valid use case for unit tests in same package: radar_test.go IS in package `data`.
	// So we can access `radarTimestampsLast`.

	radarTimestampsLast = time.Time{} // Force refresh

	res, err := GetRadarMetadata(place, 10, 20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.Start != "2023-10-27T11:00:00Z" {
		t.Errorf("expected start %s, got %s", "2023-10-27T11:00:00Z", res.Start)
	}
	if res.End != "2023-10-27T12:00:00Z" {
		t.Errorf("expected end %s, got %s", "2023-10-27T12:00:00Z", res.End)
	}
	if res.Settings == "" {
		t.Errorf("expected settings")
	}
}
