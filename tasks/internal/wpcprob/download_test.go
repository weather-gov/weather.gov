package wpcprob

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// selectFHours should pick the window already underway, then every published window after it that ends at 12z
func TestSelectFHours(t *testing.T) {
	tests := []struct {
		name   string
		cycle  string
		fhours []string
		want   []string
	}{
		// Day 1 already ends at 12z, so it isn't picked a second time as a 12z window
		{"16Z cycle", "2026091016", []string{"020", "026", "032", "038", "044", "050", "056", "062", "068"}, []string{"020", "044", "068"}},
		// Day 1 runs 18z to 18z, then the 12z windows follow
		{"21Z cycle", "2026091021", []string{"021", "027", "033", "039", "045", "051", "057", "063"}, []string{"021", "039", "063"}},
		// East and West sit on different local dates overnight, so every 12z window is kept
		{"08Z cycle", "2026091008", []string{"022", "028", "034", "040", "046", "052", "058", "064", "070", "076"}, []string{"022", "028", "052", "076"}},
		// WPC stopping short of the last 12z window leaves one fewer period
		{"08Z short feed", "2026091008", []string{"022", "028", "034", "040", "046", "052", "058", "064", "070"}, []string{"022", "028", "052"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := selectFHours(tt.cycle, tt.fhours)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if strings.Join(got, ",") != strings.Join(tt.want, ",") {
				t.Errorf("expected %v, got %v", tt.want, got)
			}
		})
	}
}

// selectFHours should error on a cycle or forecast hour it can't parse
func TestSelectFHours_Unparseable(t *testing.T) {
	if _, err := selectFHours("2026091016", []string{"abc"}); err == nil {
		t.Error("expected an error for an unparseable forecast hour")
	}
	if _, err := selectFHours("abc", []string{"024"}); err == nil {
		t.Error("expected an error for an unparseable cycle")
	}
}

// publishedFHours should dedupe the per-band listing and error when it holds no files
func TestPublishedFHours(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "empty") {
			w.Write([]byte("<html>nothing here</html>"))
			return
		}
		w.Write([]byte(`
			<a href="ndfd_co_p24i_2026090318f048.grib2">a</a>
			<a href="ndfd_co_pp24ip0p10_2026090318f048.grib2">b</a>
			<a href="ndfd_co_p24i_2026090318f024.grib2">c</a>
		`))
	}))
	defer srv.Close()
	wpcBaseURL = srv.URL

	got, err := publishedFHours(context.Background(), srv.Client(), "2026090318")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if strings.Join(got, ",") != "024,048" {
		t.Errorf("expected [024 048], got %v", got)
	}

	if _, err := publishedFHours(context.Background(), srv.Client(), "empty"); err == nil {
		t.Error("expected an error for a listing with no forecast-hour files")
	}
}

// DownloadBands should report a file WPC no longer publishes and keep the rest of the run
func TestDownloadBands_SkipsUnpublished(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "pp24ip0p10") {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Write([]byte("grib"))
	}))
	defer srv.Close()
	wpcBaseURL = srv.URL

	bands := []Band{
		{FileFragment: "p24i", Variable: "rain", Kind: KindAccumulationInches},
		{FileFragment: "pp24ip0p10", Variable: "rain", Kind: KindPercentileInches, Key: "10"},
		{FileFragment: "pp24ip0p90", Variable: "rain", Kind: KindPercentileInches, Key: "90"},
	}
	fhours := []string{"024", "048"}

	missing, err := DownloadBands(context.Background(), srv.Client(), "2026090318", fhours, t.TempDir(), bands)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// The 404 band is missing once per period, and every other file lands
	if len(missing) != len(fhours) {
		t.Errorf("expected %d misses, got %d: %v", len(fhours), len(missing), missing)
	}
	for _, name := range missing {
		if !strings.Contains(name, "pp24ip0p10") {
			t.Errorf("expected only pp24ip0p10 to be missing, got %s", name)
		}
	}
}

// DownloadBands should fail when nothing at all downloads, which is an outage rather than a band going away
func TestDownloadBands_NothingPublished(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()
	wpcBaseURL = srv.URL

	if _, err := DownloadBands(context.Background(), srv.Client(), "2026090318", []string{"024"}, t.TempDir(), BandList()); err == nil {
		t.Error("expected an error when nothing is published")
	}
}

// A 500 should be retried and then become a miss, rather than aborting the run
func TestDownloadBands_RetriesThenMisses(t *testing.T) {
	var attempts int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "pp24ip0p10") {
			attempts++
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.Write([]byte("grib"))
	}))
	defer srv.Close()
	wpcBaseURL = srv.URL

	bands := []Band{
		{FileFragment: "p24i", Variable: "rain", Kind: KindAccumulationInches},
		{FileFragment: "pp24ip0p10", Variable: "rain", Kind: KindPercentileInches, Key: "10"},
	}

	missing, err := DownloadBands(context.Background(), srv.Client(), "2026090318", []string{"024"}, t.TempDir(), bands)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(missing) != 1 {
		t.Errorf("expected 1 miss, got %v", missing)
	}
	if attempts != downloadAttempts {
		t.Errorf("expected %d attempts, got %d", downloadAttempts, attempts)
	}
}
