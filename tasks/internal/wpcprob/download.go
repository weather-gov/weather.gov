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
	"sync"
	"time"
)

var wpcBaseURL = "https://ftp-wpc.ncep.noaa.gov/prob_precip_portal/co"

// Length of the window each file accumulates over, ending at the file's forecast hour
const accumulationHours = 24

const (
	downloadWorkers  = 6
	downloadAttempts = 3
)

var fhourRe = regexp.MustCompile(`f(\d{3})\.grib2`)

// WPC names each cycle by its UTC run hour, like 2026091016
const CycleLayout = "2006010215"

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

// List the cycle's directory and return every forecast hour it publishes, ascending
func publishedFHours(ctx context.Context, client *http.Client, cycle string) ([]string, error) {
	dirURL := fmt.Sprintf("%s/ppp_co_24hr_%s/", wpcBaseURL, cycle)
	body, err := httpGet(ctx, client, dirURL)
	if err != nil {
		return nil, err
	}

	// The directory holds one file per band per forecast hour, so the same hour shows up many times over
	seen := map[string]bool{}
	var fhours []string
	for _, m := range fhourRe.FindAllStringSubmatch(string(body), -1) {
		if seen[m[1]] {
			continue
		}
		seen[m[1]] = true
		fhours = append(fhours, m[1])
	}
	if len(fhours) == 0 {
		return nil, fmt.Errorf("no forecast-hour files in %s", dirURL)
	}

	// Forecast hours are zero-padded to three digits, so sorting them as text also sorts them by number
	sort.Strings(fhours)
	return fhours, nil
}

// Pick the window already underway, then every published window after it that ends at 12z
func selectFHours(cycle string, fhours []string) ([]string, error) {
	cycleTime, err := time.Parse(CycleLayout, cycle)
	if err != nil {
		return nil, fmt.Errorf("parsing cycle %q: %w", cycle, err)
	}

	hours := make([]int, len(fhours))
	for i, f := range fhours {
		h, err := strconv.Atoi(f)
		if err != nil {
			return nil, fmt.Errorf("parsing forecast hour %q", f)
		}
		hours[i] = h
	}

	// Each window ends on a 6-hourly boundary, so the last hour up to 24 is the one already underway
	start := largestAtMost(hours, accumulationHours)

	selected := []string{fhours[start]}
	// East and West can sit on different local dates overnight, so every 12z window is kept for them to pick from
	for i := start + 1; i < len(hours); i++ {
		if (cycleTime.Hour()+hours[i])%24 == 12 {
			selected = append(selected, fhours[i])
		}
	}
	return selected, nil
}

// Index of the last hour that does not run past want
func largestAtMost(hours []int, want int) int {
	idx := 0
	for i, h := range hours {
		if h > want {
			break
		}
		idx = i
	}
	return idx
}

// Takes whatever WPC last published, for a manual run that would otherwise wait out the current hour
const AnyCycle = ""

// Poll WPC with backoff until expectedCycle is published
func WaitForCycle(ctx context.Context, client *http.Client, expectedCycle string) (cycle string, fhours []string, err error) {
	// Capped at 90 s so a late publish leaves the rest of the run inside its deadline
	delays := []time.Duration{0, 30 * time.Second, 60 * time.Second}
	var lastErr error
	for _, d := range delays {
		if d > 0 {
			select {
			case <-time.After(d):
			case <-ctx.Done():
				return "", nil, ctx.Err()
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
		published, err := publishedFHours(ctx, client, latest)
		if err != nil {
			lastErr = err
			continue
		}
		selected, err := selectFHours(latest, published)
		if err != nil {
			lastErr = err
			continue
		}
		return latest, selected, nil
	}
	return "", nil, fmt.Errorf("cycle %q not published in time: %w", expectedCycle, lastErr)
}

type download struct {
	band  Band
	fhour string
}

// Fetch every band for every forecast hour, reporting the files WPC did not serve
func DownloadBands(ctx context.Context, client *http.Client, cycle string, fhours []string, destDir string, bands []Band) ([]string, error) {
	queue := make(chan download)
	go func() {
		defer close(queue)
		for _, fhour := range fhours {
			for _, b := range bands {
				select {
				case queue <- download{band: b, fhour: fhour}:
				case <-ctx.Done():
					return
				}
			}
		}
	}()

	var mu sync.Mutex
	var missing []string
	got := 0

	var wg sync.WaitGroup
	for range downloadWorkers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			// One file's panic would otherwise take the whole process down with it
			defer func() {
				if r := recover(); r != nil {
					mu.Lock()
					missing = append(missing, fmt.Sprintf("panic: %v", r))
					mu.Unlock()
				}
			}()
			for d := range queue {
				filename := bandFilename(d.band, cycle, d.fhour)
				url := fmt.Sprintf("%s/ppp_co_24hr_%s/%s", wpcBaseURL, cycle, filename)
				err := fetchWithRetry(ctx, client, url, filepath.Join(destDir, filename))
				mu.Lock()
				if err != nil {
					missing = append(missing, filename)
				} else {
					got++
				}
				mu.Unlock()
			}
		}()
	}
	wg.Wait()

	// Every file failing means an outage or a moved directory rather than an unpublished band
	if got == 0 {
		return nil, fmt.Errorf("no bands published for cycle %s fhours %v", cycle, fhours)
	}
	return missing, nil
}

// Fetch one file, treating a 404 as WPC simply not publishing it and anything else as worth another try
func fetchWithRetry(ctx context.Context, client *http.Client, url, dest string) error {
	var lastErr error
	for attempt := range downloadAttempts {
		if attempt > 0 {
			select {
			case <-time.After(time.Duration(attempt) * time.Second):
			case <-ctx.Done():
				return ctx.Err()
			}
		}
		err := downloadFile(ctx, client, url, dest)
		if err == nil {
			return nil
		}
		var status *statusError
		if errors.As(err, &status) && status.code == http.StatusNotFound {
			return err
		}
		lastErr = err
	}
	return lastErr
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
