package data

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"testing"
	"time"
)

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

func generateForecastData(numPeriods int) *ForecastDailyResponse {
	periods := make([]ForecastPeriod, numPeriods)
	now := time.Now()

	startValid := now.Format(time.RFC3339)
	endValid := now.Add(7 * 24 * time.Hour).Format(time.RFC3339)
	validTimes := fmt.Sprintf("%s/%s", startValid, endValid)

	for i := 0; i < numPeriods; i++ {
		isDaytime := i%2 == 0
		startTime := now.Add(time.Duration(i*12) * time.Hour)
		endTime := startTime.Add(12 * time.Hour)

		_ = fmt.Sprintf("Night %d", i/2)
		if isDaytime {
			_ = fmt.Sprintf("Day %d", i/2+1)
		}

		periods[i] = ForecastPeriod{
			StartTime: startTime.Format(time.RFC3339),
			EndTime:   endTime.Format(time.RFC3339),
			IsDaytime: isDaytime,
			Temperature: 70 + func() int {
				if isDaytime {
					return 5
				} else {
					return -5
				}
			}() + rand.Intn(10),
			TemperatureUnit: "F",
			WindSpeed:       fmt.Sprintf("%d mph", rand.Intn(20)),
			WindDirection:   "SW",
			Icon:            "https://api.weather.gov/icons/land/day/few?size=medium",
			ShortForecast: func() string {
				if isDaytime {
					return "Sunny"
				} else {
					return "Partly Cloudy"
				}
			}(),
			DetailedForecast: "Detailed forecast text goes here...",
		}
		// ProbabilityOfPrecipitation structure assignment
		periods[i].ProbabilityOfPrecipitation.UnitCode = "wmoUnit:percent"
		periods[i].ProbabilityOfPrecipitation.Value = rand.Intn(30)
	}

	return &ForecastDailyResponse{
		Properties: ForecastDailyProperties{
			UpdateTime:  now.Add(-1 * time.Hour).Format(time.RFC3339),
			ValidTimes:  validTimes,
			Periods:     periods,
			GeneratedAt: now.Format(time.RFC3339),
			Elevation: struct {
				UnitCode string  `json:"unitCode"`
				Value    float64 `json:"value"`
			}{
				UnitCode: "wmoUnit:m",
				Value:    100.0,
			},
		},
	}
}

func generateRiskData(numDays int) map[string]interface{} {
	data := make(map[string]interface{})
	risks := []string{"Tornado", "Hail", "Wind", "WrappedRisk"}
	now := time.Now()

	for i := 0; i < numDays; i++ {
		// Format matching regex in processing.ts / Go equivalent if any
		dateKey := now.Add(time.Duration(i)*24*time.Hour).Format("2006-01-02") + "T12:00:00+00:00"
		dayRisks := make(map[string]interface{})

		for _, risk := range risks {
			dayRisks[risk] = map[string]interface{}{
				"category":    rand.Intn(5),
				"probability": rand.Float64(),
			}
		}
		// Add DailyComposite
		dayRisks["DailyComposite"] = map[string]interface{}{"category": 3}

		data[dateKey] = dayRisks
	}

	data["creationDate"] = now.Format(time.RFC3339)
	data["wfo"] = "OUN"

	return data
}

// ============================================================================
// BENCHMARKS
// ============================================================================

// BenchmarkForecastProcessing measures the performance of processing the daily forecast.
func BenchmarkForecastProcessing(b *testing.B) {
	// Setup
	input := generateForecastData(14)
	place := &Place{Timezone: "America/New_York"} // Use a fixed timezone for benchmark

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = ForecastDaily(input, place)
	}
}

// BenchmarkRiskProcessing measures the performance of processing risk overview data.
// Note: The Go implementation currently fetches pre-processed JSON from the DB via GetRiskOverview.
// The Node.js implementation (processDays in processing.ts) processes raw data.
// To make a fair CPU benchmark comparison of *processing logic*, we should implement
// a Go equivalent of the Node.js processing logic here, or benchmark the existing Go logic if it differs.
// Since the goal is comparison, and if Go relies on DB for this, the "Go Processing" might be 0 CPU
// but high I/O.
// However, if the goal is to see if Go *can* do it faster, or simply to compare current architectures:
// Node: Fetch -> Process (CPU heavy) -> Return
// Go: Fetch (DB) -> Return (IO heavy)
// benchmarking GetRiskOverview with a mocked DB would test the JSON unmarshal speed.
// Let's do that for now, as it reflects the actual Go path.
// But to benchmark purely CPU "logic" we would need to port the logic.
// Given the prompt asks to "compare performance of original and current implementations",
// benchmarking the *current Go implementation* (even if it's just unmarshaling) is correct.
// So we will mock the DB scan.
func BenchmarkRiskProcessing(b *testing.B) {
	// In Go, the "processing" is merely Unmarshaling the JSON stored in DB.
	// So we benchmark JSON unmarshal of the structure.
	data := generateRiskData(7)
	bytes, _ := json.Marshal(data)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		var result RiskOverviewResult
		_ = json.Unmarshal(bytes, &result)
	}
}
