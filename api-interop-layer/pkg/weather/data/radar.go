package data

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"regexp"
	"strings"
	"sync"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

var (
	radarTimestamps struct {
		Start string
		End   string
	}
	radarTimestampsLast time.Time
	radarMutex          sync.Mutex
)

type RadarMetadata struct {
	Start    string `json:"start"`
	End      string `json:"end"`
	Settings string `json:"settings"`
}

type RadarSettings struct {
	Agenda RadarAgenda `json:"agenda"`
}

type RadarAgenda struct {
	ID     string    `json:"id"`
	Center []float64 `json:"center"`
	Zoom   int       `json:"zoom"`
	Layer  string    `json:"layer"`
}

func GetRadarMetadata(place *Place, latitude, longitude float64) (*RadarMetadata, error) {
	if place == nil || place.Timezone == "" {
		return &RadarMetadata{}, nil
	}

	radarMutex.Lock()
	defer radarMutex.Unlock()

	if time.Since(radarTimestampsLast) > 60*time.Second {
		// Update cache
		url := "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?service=wms&version=1.1.1&request=GetCapabilities"
		// Use shared HTTP client
		resp, err := util_golang.HTTPClient.Get(url)
		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			xmlStr := string(body)

			re := regexp.MustCompile(`<Extent name="time".*>(.+)</Extent>`)
			match := re.FindStringSubmatch(xmlStr)
			if len(match) > 1 {
				times := strings.Split(match[1], ",")
				if len(times) > 0 {
					radarTimestamps.Start = times[0]
					if len(times) >= 20 {
						// slice -20 like TS: "slice(-20)"
						// TS: pop() gets the last one.
						// range = times.split(",").slice(-20)
						// start = range[0], end = range.pop()
						// So start is the 20th from last?
						// No, slice(-20) returns new array with last 20 items.
						// range[0] is the 20th item from the end.
						startIndex := len(times) - 20
						if startIndex < 0 {
							startIndex = 0
						}
						radarTimestamps.Start = times[startIndex]
					} else {
						radarTimestamps.Start = times[0]
					}
					radarTimestamps.End = times[len(times)-1]
				}
				radarTimestampsLast = time.Now()
			}
		}
	}

	// Format times in timezone
	// Input format from geoserver? Usually ISO8601.
	// TS code: dayjs.utc(radarTimestamps.start).tz(timezone).format()
	// Go code needs Timezone

	startFmt := ""
	endFmt := ""

	toParams := func(ts string) string {
		var t time.Time
		var err error
		// Try parsing ISO
		t, err = time.Parse("2006-01-02T15:04:05.000Z", ts)
		if err != nil {
			t, err = time.Parse(time.RFC3339, ts)
		}
		if err != nil {
			return ""
		}

		converted, err := util_golang.ConvertTimezone(t, place.Timezone)
		if err != nil {
			return ""
		}
		return converted.Format(time.RFC3339)
	}

	if radarTimestamps.Start != "" {
		startFmt = toParams(radarTimestamps.Start)
	}
	if radarTimestamps.End != "" {
		endFmt = toParams(radarTimestamps.End)
	}

	settings := RadarSettings{
		Agenda: RadarAgenda{
			ID:     "weather",
			Center: []float64{longitude, latitude},
			Zoom:   8,
			Layer:  "bref_qcd",
		},
	}
	settingsJSON, _ := json.Marshal(settings)
	settingsB64 := base64.StdEncoding.EncodeToString(settingsJSON)

	return &RadarMetadata{
		Start:    startFmt,
		End:      endFmt,
		Settings: settingsB64,
	}, nil
}
