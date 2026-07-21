package wpcprob

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const wpcBaseURL = "https://ftp-wpc.ncep.noaa.gov/prob_precip_portal/co"

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

// List the cycle's directory and return its earliest available forecast hour
func smallestFHour(ctx context.Context, client *http.Client, cycle string) (string, error) {
	dirURL := fmt.Sprintf("%s/ppp_co_24hr_%s/", wpcBaseURL, cycle)
	body, err := httpGet(ctx, client, dirURL)
	if err != nil {
		return "", err
	}
	matches := fhourRe.FindAllStringSubmatch(string(body), -1)
	if len(matches) == 0 {
		return "", fmt.Errorf("no forecast-hour files found in %s", dirURL)
	}
	seen := map[string]bool{}
	var fhours []string
	for _, m := range matches {
		if !seen[m[1]] {
			seen[m[1]] = true
			fhours = append(fhours, m[1])
		}
	}
	sort.Strings(fhours)
	return fhours[0], nil
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
		fh, err := smallestFHour(ctx, client, latest)
		if err != nil {
			lastErr = err
			continue
		}
		return latest, fh, nil
	}
	return "", "", fmt.Errorf("cycle %s not published in time: %w", expectedCycle, lastErr)
}

// Download every band's grib2 file for the given cycle/fhour into destDir
func DownloadBands(ctx context.Context, client *http.Client, cycle, fhour, destDir string, bands []Band) error {
	for _, b := range bands {
		filename := bandFilename(b, cycle, fhour)
		url := fmt.Sprintf("%s/ppp_co_24hr_%s/%s", wpcBaseURL, cycle, filename)
		if err := downloadFile(ctx, client, url, filepath.Join(destDir, filename)); err != nil {
			return fmt.Errorf("downloading %s: %w", filename, err)
		}
	}
	return nil
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
		return nil, fmt.Errorf("%s: %s", url, resp.Status)
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
