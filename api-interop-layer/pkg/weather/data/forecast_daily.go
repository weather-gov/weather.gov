package data

import (
	"strconv"
	"strings"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

type ForecastResult struct {
	GridData *GridpointResult `json:"gridData"`
	*ForecastDailyResult
	Error bool `json:"error,omitempty"`
}

type ForecastDailyResult struct {
	GeneratedAt string        `json:"generatedAt"`
	UpdateTime  string        `json:"updateTime"`
	ValidTimes  string        `json:"validTimes"`
	Elevation   interface{}   `json:"elevation,omitempty"`
	Days        []ForecastDay `json:"days"`
	Error       bool          `json:"error,omitempty"`
}

func ForecastDaily(data *ForecastDailyResponse, place *Place) *ForecastDailyResult {
	if data.Error {
		return &ForecastDailyResult{Error: true, Days: []ForecastDay{}}
	}

	days := []ForecastDay{}
	previousDay := -1
	now := time.Now() // UTC

	for _, period := range data.Properties.Periods {
		t, err1 := time.Parse(time.RFC3339, period.StartTime)
		if err1 != nil {
			continue // Log error?
		}
		start, err2 := util_golang.ConvertTimezone(t, place.Timezone)
		if err2 != nil {
			continue
		}

		tEnd, err3 := time.Parse(time.RFC3339, period.EndTime)
		if err3 != nil {
			continue
		}

		if tEnd.Before(now) {
			continue
		}

		dayNum := start.Day()
		if dayNum != previousDay {
			if len(days) > 0 {
				days[len(days)-1].End = period.StartTime // Use RFC3339 string from input
			}

			days = append(days, ForecastDay{
				Start:   start.Format(time.RFC3339),
				Periods: []DayPeriod{},
			})
			previousDay = dayNum
		}

		// Update end of current day (which is last in list)
		if len(days) > 0 {
			days[len(days)-1].End = tEnd.Format(time.RFC3339) // use actual end time logic?
			// TS code: days[days.length - 1].end = dayjs(period.endTime).tz(timezone).format();
			// My code: tEnd is parsed. I should convert it.
			convertedEnd, _ := util_golang.ConvertTimezone(tEnd, place.Timezone)
			days[len(days)-1].End = convertedEnd.Format(time.RFC3339)
		}

		// Process Period Data
		// Converted Data
		converted := util_golang.ConvertProperties(map[string]interface{}{
			"icon":        util_golang.ParseAPIIcon(period.Icon),
			"description": util_golang.SentenceCase(period.ShortForecast),
			"temperature": map[string]interface{}{
				"unitCode": "wmoUnit:degF",
				"value":    period.Temperature,
			},
			"probabilityOfPrecipitation": map[string]interface{}{
				"unitCode": period.ProbabilityOfPrecipitation.UnitCode,
				"value":    float64(valueFromPtr(period.ProbabilityOfPrecipitation.Value)),
			},
			"windSpeed": map[string]interface{}{
				"unitCode": "wxgov:mph",
				"value":    parseInt(period.WindSpeed),
			},
			"windDirection": period.WindDirection, // This is string?
			// util_golang.ConvertProperties ignores keys that don't match unit/uom logic?
			// But for windDirection it might be just passed through or converted if it has units?
			// TS: `windDirection: period.windDirection`.
			// If it's a string, util_golang.ConvertProperties loop `subMap, ok := v.(map...)` will fail and skip it?
			// Let's check `convert.go` logic again.
			// `for k, v := range obj { subMap, ok := v.(map...); if !ok { continue } ... }`
			// So `util_golang.ConvertProperties` ONLY touches sub-objects with units.
			// It returns `obj` modified.
			// So if I pass "windDirection": "N", it stays "N".
			// So that works.
		})

		// Add period ...
		// I need full impl of convert properties map construction.

		// Simplified struct addition
		dayPeriod := DayPeriod{
			Start:     start.Format(time.RFC3339),
			End:       tEnd.Format(time.RFC3339), // need formatted?
			IsDaytime: period.IsDaytime,
			Data:      converted,
		}

		days[len(days)-1].Periods = append(days[len(days)-1].Periods, dayPeriod)
	}

	// Overnight logic
	if len(days) > 0 {
		if len(days[0].Periods) == 3 {
			days[0].Periods[0].IsOvernight = true
		}
	}

	// Filter empty days
	finalDays := []ForecastDay{}
	for _, d := range days {
		if len(d.Periods) > 0 {
			finalDays = append(finalDays, d)
		}
	}

	// Elevation conversion
	elev := util_golang.ConvertProperties(map[string]interface{}{
		"elevation": map[string]interface{}{
			"unitCode": data.Properties.Elevation.UnitCode,
			"value":    data.Properties.Elevation.Value,
		},
	})

	return &ForecastDailyResult{
		GeneratedAt: data.Properties.GeneratedAt,
		UpdateTime:  data.Properties.UpdateTime,
		ValidTimes:  data.Properties.ValidTimes,
		Elevation:   elev["elevation"],
		Days:        finalDays,
	}
}

func parseInt(s string) int {
	// "10 mph" -> 10
	fields := strings.Fields(s)
	if len(fields) > 0 {
		val, _ := strconv.Atoi(fields[0])
		return val
	}
	return 0
}

func valueFromPtr(i *int) int {
	if i == nil {
		return 0
	}
	return *i
}
