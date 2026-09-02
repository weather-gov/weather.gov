package wpcprob

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

var wpcBaseURL = "https://ftp-wpc.ncep.noaa.gov/prob_precip_portal/co"

// Length of the window each file accumulates over, ending at the file's forecast hour
const accumulationHours = 24

var fhourRe = regexp.MustCompile(`f(\d{3})\.grib2`)

// Read the most recently published cycle from WPC's latest_cycle.txt
func fetchLatestCycle(ctx context.Context, client *http.Client) (string, error) {
	body, err := httpGet(ctx, client, wpcBaseURL+"/latest_cycle.txt")
	if err != nil {
		return "", err
	}
	fields := strings.Fields(string(body))
	if len(fields) == 0 {
		return "", fmt.Errorf("empty latest_cycle.txt")
	}
	return fields[0], nil
}

// List the cycle's directory and return the forecast hour to download
func currentWindowFHour(ctx context.Context, client *http.Client, cycle string) (string, error) {
	dirURL := fmt.Sprintf("%s/ppp_co_24hr_%s/", wpcBaseURL, cycle)
	body, err := httpGet(ctx, client, dirURL)
	if err != nil {
		return "", err
	}

	// The directory holds one file per band per forecast hour, so the same hour shows up many times over
	var fhours []string
	for _, m := range fhourRe.FindAllStringSubmatch(string(body), -1) {
		fhours = append(fhours, m[1])
	}

	fhour, err := selectFHour(fhours)
	if err != nil {
		return "", fmt.Errorf("%w in %s", err, dirURL)
	}
	return fhour, nil
}

// Pick the forecast hour whose 24-hour window covers the most of the day after the cycle
func selectFHour(fhours []string) (string, error) {
	// Forecast hours are zero-padded to three digits, so sorting them as text also sorts them by number
	sort.Strings(fhours)

	// Each window ends on a 6-hourly boundary, so the last hour up to 24 is the window already underway
	underway := ""
	for _, fhour := range fhours {
		hours, err := strconv.Atoi(fhour)
		if err != nil {
			return "", fmt.Errorf("parsing forecast hour %q", fhour)
		}
		if hours > accumulationHours {
			break
		}
		underway = fhour
	}
	if underway != "" {
		return underway, nil
	}

	// Every window still starts after the cycle, so the soonest one is the closest available
	if len(fhours) > 0 {
		return fhours[0], nil
	}
	return "", fmt.Errorf("no forecast-hour files")
}

// Poll WPC with backoff until expectedCycle is published
func WaitForCycle(ctx context.Context, client *http.Client, expectedCycle string) (cycle, fhour string, err error) {
	delays := []time.Duration{0, 30 * time.Second, 60 * time.Second, 90 * time.Second, 120 * time.Second}
	var lastErr error
	for _, d := range delays {
		if d > 0 {
			select {
			case <-time.After(d):
			case <-ctx.Done():
				return "", "", ctx.Err()
			}
		}
		latest, err := fetchLatestCycle(ctx, client)
		if err != nil {
			lastErr = err
			continue
		}
		if latest < expectedCycle {
			lastErr = fmt.Errorf("latest cycle %s not yet >= expected %s", latest, expectedCycle)
			continue
		}
		fh, err := currentWindowFHour(ctx, client, latest)
		if err != nil {
			lastErr = err
			continue
		}
		return latest, fh, nil
	}
	return "", "", fmt.Errorf("cycle %s not published in time: %w", expectedCycle, lastErr)
}

// Download each band's grib2 file for the given cycle/fhour into destDir, returning the bands WPC publishes
func DownloadBands(ctx context.Context, client *http.Client, cycle, fhour, destDir string, bands []Band) ([]Band, []string, error) {
	var kept []Band
	var missing []string
	for _, b := range bands {
		filename := bandFilename(b, cycle, fhour)
		url := fmt.Sprintf("%s/ppp_co_24hr_%s/%s", wpcBaseURL, cycle, filename)
		err := downloadFile(ctx, client, url, filepath.Join(destDir, filename))
		if err != nil {
			// An unpublished band 404s, and only that band is lost, so the rest of the run still stands
			var status *statusError
			if errors.As(err, &status) && status.code == http.StatusNotFound {
				missing = append(missing, b.FileFragment)
				continue
			}
			return nil, nil, fmt.Errorf("downloading %s: %w", filename, err)
		}
		kept = append(kept, b)
	}
	// Every band 404ing means an outage or a moved directory rather than an unpublished band
	if len(kept) == 0 {
		return nil, nil, fmt.Errorf("no bands published for cycle %s fhour %s", cycle, fhour)
	}
	return kept, missing, nil
}

// Carries the status code so callers can tell an unpublished band from an outage
type statusError struct {
	url  string
	code int
	text string
}

func (e *statusError) Error() string {
	return fmt.Sprintf("%s: %s", e.url, e.text)
}

// GET url, returning an error if the response isn't 200. Caller must close the body.
func doGet(ctx context.Context, client *http.Client, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return nil, &statusError{url: url, code: resp.StatusCode, text: resp.Status}
	}
	return resp, nil
}

// GET url and write the response body to dest
func downloadFile(ctx context.Context, client *http.Client, url, dest string) error {
	resp, err := doGet(ctx, client, url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, resp.Body)
	return err
}

// GET url and return the response body
func httpGet(ctx context.Context, client *http.Client, url string) ([]byte, error) {
	resp, err := doGet(ctx, client, url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
