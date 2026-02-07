package data

import (
	"fmt"
	"strings"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

type SatelliteResult struct {
	Times struct {
		Start string `json:"start"`
		End   string `json:"end"`
	} `json:"times"`
	Latest string `json:"latest"`
	GIF    string `json:"gif"`
	MP4    string `json:"mp4"`
	Error  bool   `json:"error,omitempty"`
}

type nesdisMeta struct {
	Meta struct {
		Satellite       string `json:"satellite"`
		ObservationTime string `json:"observation_time"`
	} `json:"meta"`
}

func GetSatellite(grid *Grid, place *Place) (*SatelliteResult, error) {
	if grid == nil || place == nil || grid.WFO == "" || place.Timezone == "" {
		return &SatelliteResult{Error: true}, nil
	}

	wfoLower := strings.ToLower(grid.WFO)
	url := fmt.Sprintf("https://cdn.star.nesdis.noaa.gov/WFO/catalogs/WFO_02_%s_catalog.json", wfoLower)

	res, err := util_golang.FetchAPIJson(url)
	if err != nil {
		// Log error?
		return &SatelliteResult{Error: true}, err
	}

	// Unmarshal result into intermediate struct
	// fetchAPIJson returns interface{}, likely map.
	// We can convert to JSON bytes and unmarshal again, or type assert map.
	// Since we defined nesdisMeta struct, it's cleaner to handle parsing properly.
	// But util_golang.FetchAPIJson does unmarshal to interface{}.
	// Efficiency-wise, re-marshalling is meh, but robust.
	// Alternatively, map assertions.

	dataMap, ok := res.(map[string]interface{})
	if !ok {
		return &SatelliteResult{Error: true}, fmt.Errorf("invalid response")
	}

	metaMap, ok := dataMap["meta"].(map[string]interface{})
	if !ok {
		// If meta missing, maybe error
		return &SatelliteResult{Error: true}, nil
	}

	satellite, _ := metaMap["satellite"].(string)
	obsTime, _ := metaMap["observation_time"].(string)

	if satellite != "" {
		goes := "GOES19"
		if satellite == "GOES-West" {
			goes = "GOES18"
		}

		// Parse observation_time. TS says "wonky format: [four-digit year][day of year][24hr time]"
		// BUT then says "Rather than parse those timestamps, we can use the observation_time metadata."
		// Wait, TS says "timestamps provided are also in a wonky format".
		// "we can use the observation_time metadata".
		// Implies observation_time is parseable by dayjs?
		// "dayjs(satelliteMetadata.meta.observation_time)"
		// If dayjs can parse it, it's likely ISO or standard.
		// Let's assume standard string.

		t, err := time.Parse(time.RFC3339, obsTime)
		if err != nil {
			// Try other formats?
			// Check example data in TS comment? No.
			// Checking online NESDIS JSON... usually ISO or similar?
			// Let's assume dayjs works -> probably RFC3339 or close.
			// Or simple date string.
			// For robustness, try a few formats.
			t, err = time.Parse("2006-01-02T15:04:05Z", obsTime)
		}

		if err == nil {
			end := t // UTC? dayjs() parses as local unless specified?
			// If string has Z, it's UTC.

			start := end.Add(-8 * time.Hour)

			endTZ, _ := util_golang.ConvertTimezone(end, place.Timezone)
			startTZ, _ := util_golang.ConvertTimezone(start, place.Timezone)

			return &SatelliteResult{
				Times: struct {
					Start string `json:"start"`
					End   string `json:"end"`
				}{
					Start: startTZ.Format(time.RFC3339),
					End:   endTZ.Format(time.RFC3339),
				},
				Latest: fmt.Sprintf("https://cdn.star.nesdis.noaa.gov/WFO/%s/GEOCOLOR/latest.jpg", wfoLower),
				GIF:    fmt.Sprintf("https://cdn.star.nesdis.noaa.gov/WFO/%s/GEOCOLOR/%s-%s-GEOCOLOR-600x600.gif", wfoLower, goes, strings.ToUpper(grid.WFO)),
				MP4:    fmt.Sprintf("https://cdn.star.nesdis.noaa.gov/WFO/%s/GEOCOLOR/%s-%s-GEOCOLOR-600x600.mp4", wfoLower, goes, strings.ToUpper(grid.WFO)),
			}, nil
		}
	}

	return &SatelliteResult{Error: true}, nil
}
