package data

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

// Mock Upstream Server for Integration Tests
func setupIntegrationMockServer() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Mock Gridpoint Response
		if r.URL.Path == "/gridpoints/TOP/10,20" {
			fmt.Fprintln(w, `{
				"properties": {
					"quantitativePrecipitation": { "uom": "wmoUnit:mm", "values": [] }
				},
				"geometry": {}
			}`)
			return
		}

		// Mock Forecast Daily Response
		if r.URL.Path == "/gridpoints/TOP/10,20/forecast" {
			now := time.Now()
			start := now.Add(24 * time.Hour).Format(time.RFC3339)
			end := now.Add(48 * time.Hour).Format(time.RFC3339)
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

		w.WriteHeader(404)
	}))
}

// BenchmarkIntegration_Forecast benchmarks the request flow for getting a forecast.
func BenchmarkIntegration_Forecast(b *testing.B) {
	upstream := setupIntegrationMockServer()
	defer upstream.Close()

	originalClient := util_golang.HTTPClient
	util_golang.HTTPClient = &http.Client{
		Transport: &testTransport{
			Transport: http.DefaultTransport,
			TargetURL: upstream.URL,
		},
	}
	defer func() { util_golang.HTTPClient = originalClient }()

	grid := &Grid{WFO: "TOP", X: 10, Y: 20}
	place := &Place{Timezone: "UTC"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := GetForecast(grid, place, false)
		if err != nil {
			b.Fatalf("GetForecast failed: %v", err)
		}
	}
}

// BenchmarkIntegration_Alerts fetches alerts.
func BenchmarkIntegration_Alerts(b *testing.B) {
	// Simple mock of post processing since we can't easily mock DB here
	count := 100
	alerts := make([]Alert, count)
	now := time.Now()
	for i := 0; i < count; i++ {
		alerts[i] = Alert{
			Properties: map[string]interface{}{
				"event": "Tsunami Warning",
				"onset": now.Format(time.RFC3339),
				"ends":  now.Add(1 * time.Hour).Format(time.RFC3339),
			},
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = PostProcessAlerts(alerts, "UTC")
	}
}
