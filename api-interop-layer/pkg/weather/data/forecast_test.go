package data

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

func TestGetForecast(t *testing.T) {
	// Mock APIs
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/gridpoints/TOP/10,20" {
			// Gridpoint
			fmt.Fprintln(w, `{
				"properties": {
					"quantitativePrecipitation": {
                        "uom": "wmoUnit:mm",
                        "values": []
                    }
				},
				"geometry": {}
			}`)
			return
		}
		if r.URL.Path == "/gridpoints/TOP/10,20/forecast" {
			// Daily
			start := time.Now().Add(24 * time.Hour).Format(time.RFC3339)
			end := time.Now().Add(48 * time.Hour).Format(time.RFC3339)
			fmt.Fprintf(w, `{
				"properties": {
					"periods": [
                        {
                            "startTime": "%s",
                            "endTime": "%s",
                            "isDaytime": true,
                            "temperature": 70,
                            "windSpeed": "10 mph",
                            "shortForecast": "Sunny"
                        }
                    ]
				}
			}`, start, end)
			return
		}
		if r.URL.Path == "/gridpoints/TOP/10,20/forecast/hourly" {
			// Hourly
			start := time.Now().Add(24 * time.Hour).Format(time.RFC3339)
			end := time.Now().Add(25 * time.Hour).Format(time.RFC3339)
			fmt.Fprintf(w, `{
				"properties": {
					"periods": [
                        {
                            "startTime": "%s",
                            "endTime": "%s",
                            "shortForecast": "Sunny"
                        }
                    ]
				}
			}`, start, end)
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

	grid := &Grid{WFO: "TOP", X: 10, Y: 20}
	place := &Place{Timezone: "UTC"}

	res, err := GetForecast(grid, place, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.Daily == nil {
		t.Fatal("expected daily data")
	}
	if len(res.Daily.Days) == 0 {
		t.Fatal("expected days")
	}

	// Check content
	day := res.Daily.Days[0]
	if len(day.Periods) != 1 {
		t.Errorf("expected 1 period, got %d", len(day.Periods))
	}
	// Check shortForecast
	// util_golang.SentenceCase "Sunny" -> "sunny"
	// But in daily.ts conversion?
	// `description: sentenceCase(period.shortForecast)`
	// I need to check map key.

	per := day.Periods[0]
	desc, ok := per.Data["description"].(string)
	if !ok || desc != "Sunny" {
		t.Errorf("expected Sunny description, got %v", per.Data["description"])
	}
}
