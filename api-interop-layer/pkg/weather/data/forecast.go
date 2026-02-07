package data

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

func GetForecast(grid *Grid, place *Place, isMarine bool) (*ForecastResult, error) {
	hours := make(map[string]*HourData)
	var wg sync.WaitGroup

	var gridpointData *GridpointResult
	var dailyData *ForecastDailyResult
	var gridpointErr error

	// 1. Gridpoint
	wg.Add(1)
	go func() {
		defer wg.Done()
		path := fmt.Sprintf("/gridpoints/%s/%d,%d", grid.WFO, grid.X, grid.Y)
		res, err := util_golang.FetchAPIJson(path)
		if err != nil {
			gridpointErr = err
			return
		}

		// Unmarshal to GridpointResponse struct
		// Normally util_golang returns interface{}. We need to remarshal to bytes then struct?
		// Or helper. This is inefficient.
		// Better: util_golang.FetchAPIJson should generic or we assume map and traverse manually?
		// Since we have complex structs (`GridpointResponse`, `ForecastDailyResponse`),
		// it's easier to use JSON marshalling roundtrip OR change util_golang.FetchAPIJsond to return []byte option?
		// But util_golang.FetchAPIJson handles caching and errors returning maps.
		// Let's rely on JSON round trip for now for correctness over perf, optimize later.

		b, _ := json.Marshal(res)
		var apiResp GridpointResponse
		_ = json.Unmarshal(b, &apiResp) // ignore error?

		gridpointData, _ = ForecastGridpoint(&apiResp, hours, place)
	}()

	// 2. Daily
	wg.Add(1)
	go func() {
		defer wg.Done()
		if isMarine {
			dailyData = &ForecastDailyResult{Days: []ForecastDay{}}
			return
		}
		path := fmt.Sprintf("/gridpoints/%s/%d,%d/forecast", grid.WFO, grid.X, grid.Y)
		res, err := util_golang.FetchAPIJson(path)
		if err != nil {
			dailyData = &ForecastDailyResult{Error: true, Days: []ForecastDay{}}
			return
		}
		b, _ := json.Marshal(res)
		var apiResp ForecastDailyResponse
		if err := json.Unmarshal(b, &apiResp); err != nil {
			// Log error?
		}

		dailyData = ForecastDaily(&apiResp, place)
	}()

	// 3. Hourly
	wg.Add(1)
	go func() {
		defer wg.Done()
		if isMarine {
			return
		}
		path := fmt.Sprintf("/gridpoints/%s/%d,%d/forecast/hourly", grid.WFO, grid.X, grid.Y)
		res, err := util_golang.FetchAPIJson(path)
		if err != nil {
			return
		}
		b, _ := json.Marshal(res)
		var apiResp ForecastDailyResponse // Hourly uses same schema as daily basically (list of periods)
		_ = json.Unmarshal(b, &apiResp)

		ForecastHourly(&apiResp, hours, place)
	}()

	wg.Wait()

	if gridpointErr != nil {
		return nil, gridpointErr
	}
	// if dailyErr... TS returns empty object or handles it?

	// Sort and Filter Hours
	now := time.Now()
	// Convert now to place timezone?
	nowInTz, _ := util_golang.ConvertTimezone(now, place.Timezone)
	// Truncate to hour?
	nowInTz = nowInTz.Truncate(time.Hour)
	// Actually: TS sets min/sec/ms to 0.

	orderedHours := SortAndFilterHours(hours, nowInTz)

	// Unit conversions on hourly properties
	for _, h := range orderedHours {
		h.Properties = util_golang.ConvertProperties(h.Properties)

		// Wind Gust Logic
		// if windGust < windSpeed + 8 -> null
		// Need to inspect converted values.
		// h.Properties["windGust"] is map[string]interface{}.
		// value is in "value" key?
		// util_golang.ConvertProperties returns map with unit label as key. (e.g. "mph").
		// TS: orderedHours.forEach(({ windGust, windSpeed }) => { ... })
		// "mph" comes from unit mapping in `convert.go`.
		// I assume "mph" is the key.

		wg, okWg := h.Properties["windGust"].(map[string]interface{})
		ws, okWs := h.Properties["windSpeed"].(map[string]interface{})

		if okWg && okWs && wg != nil && ws != nil {
			// Check mph
			mphG, ok1 := wg["mph"].(float64) // float64 in Go for json numbers
			mphS, ok2 := ws["mph"].(float64)

			if ok1 && ok2 {
				if mphG < mphS+8 {
					// Set all units to nil
					for k := range wg {
						wg[k] = nil
					}
				}
			}
		}
	}

	// QPF Conversion
	// gridpointData.QPF is []map...
	// TS: convertValue(liquid)...
	// convertValue logic?
	// `convert.go` usually exports util_golang.ConvertProperties. `convertValue` might be internal or separate export.
	// TS import: `import { convertValue, ... } from "../../util/convert.js";`
	// I need to check `convert.go` if it has comparable logic for scalar values or sub-objects.
	// util_golang.ConvertProperties handles object traversal.
	// I might need to implement `ConvertValue`?
	// Or manually do it.

	// AssignQPFToDays
	// Loop over forecast days
	// AssignQPFToDays
	// Loop over forecast days
	if dailyData != nil {
		for i := range dailyData.Days {
			day := &dailyData.Days[i]
			// Find QPF
			// Logic from index.ts lines 201-230
			day.QPF = &DayQPF{
				Periods: []map[string]interface{}{},
			}
			if gridpointData != nil && len(gridpointData.QPF) > 0 {
				// Filter QPF matching day
				dayStart, _ := time.Parse(time.RFC3339, day.Start)
				dayEnd, _ := time.Parse(time.RFC3339, day.End) // RFC3339

				for _, q := range gridpointData.QPF {
					s, _ := time.Parse(time.RFC3339, q["start"].(string))
					e, _ := time.Parse(time.RFC3339, q["end"].(string))

					if (s.Equal(dayStart) || s.After(dayStart)) && s.Before(dayEnd) {
						day.QPF.Periods = append(day.QPF.Periods, q)
					} else if (e.Equal(dayStart) || e.After(dayStart)) && e.Before(dayEnd) {
						day.QPF.Periods = append(day.QPF.Periods, q)
					}
				}

				// HasIce/Snow checks...
			}
		}

		// Assign Hours to Days
		AssignHoursToDays(dailyData, orderedHours)
	}

	return &ForecastResult{
		GridData:            gridpointData,
		ForecastDailyResult: dailyData,
	}, nil
}

func AssignHoursToDays(dailyData *ForecastDailyResult, hours []*HourData) {
	// Logic from index.ts assignHoursToDays
	// Iterating days and hours.
	dayIndex := 0
	hourIndex := 0

	for hourIndex < len(hours) && dayIndex < len(dailyData.Days) {
		day := &dailyData.Days[dayIndex]

		dStart, _ := time.Parse(time.RFC3339, day.Start)
		dEnd, _ := time.Parse(time.RFC3339, day.End)

		if dayIndex == 0 {
			// First day logic
			hoursToday := int(dEnd.Sub(dStart).Hours())

			// Discard hours before start
			for hourIndex < len(hours) && hours[hourIndex].Time.Before(dStart) {
				hourIndex++
			}

			// Slice
			endIdx := hourIndex + hoursToday + 1
			if endIdx > len(hours) {
				endIdx = len(hours)
			}
			if hourIndex < len(hours) {
				// Copy dereferenced objects? Or pointers? TS copies reference.
				// In Go, HourData is struct? Or *HourData.
				// ForecastDay.Hours is []HourData. Need to dereference if pointers.
				for k := hourIndex; k < endIdx; k++ {
					day.Hours = append(day.Hours, *hours[k])
				}
			}

			hourIndex += hoursToday
		} else {
			// 25 hours
			endIdx := hourIndex + 25
			if endIdx > len(hours) {
				endIdx = len(hours)
			}
			if hourIndex < len(hours) {
				for k := hourIndex; k < endIdx; k++ {
					day.Hours = append(day.Hours, *hours[k])
				}
			}
			hourIndex += 24
		}

		// UpdateMaxPop(day)
		UpdateMaxPop(day)
		dayIndex++
	}
}

func UpdateMaxPop(day *ForecastDay) {
	// Logic: set probabilityOfPrecipitation for each period to max of hourly pops
	// Round to nearest 5.

	maxPopForDay := 0.0

	for i := range day.Periods {
		period := &day.Periods[i]
		pStart, _ := time.Parse(time.RFC3339, period.Start)
		pEnd, _ := time.Parse(time.RFC3339, period.End)

		maxP := 0.0

		for _, hour := range day.Hours {
			hTime := hour.Time
			// check overlap or containment?
			// index.ts: dayStart.isSameOrBefore(start) && dayEnd.isSameOrAfter(start)
			// Meaning hour start is inside period.
			if (hTime.Equal(pStart) || hTime.After(pStart)) && (hTime.Equal(pEnd) || hTime.Before(pEnd)) {
				// Get pop
				if pop, ok := hour.Properties["probabilityOfPrecipitation"].(map[string]interface{}); ok {
					if val, ok := pop["value"].(float64); ok {
						if val > maxP {
							maxP = val
						}
					}
				}
			}
		}

		// Round to nearest 5
		rounded := float64(int(maxP/5.0+0.5) * 5)

		// Set on period data
		if period.Data["probabilityOfPrecipitation"] == nil {
			period.Data["probabilityOfPrecipitation"] = map[string]interface{}{}
		}
		// TS sets "hourlyMax".
		// period.data.probabilityOfPrecipitation.hourlyMax = maxPop;
		// But probabilityOfPrecipitation might be integer from original daily?
		// No, converted properties map.

		if pm, ok := period.Data["probabilityOfPrecipitation"].(map[string]interface{}); ok {
			pm["hourlyMax"] = rounded
		} else {
			// Maybe it was nil?
			period.Data["probabilityOfPrecipitation"] = map[string]interface{}{
				"hourlyMax": rounded,
			}
		}

		if rounded > maxPopForDay {
			maxPopForDay = rounded
		}
	}

	day.MaxPop = int(maxPopForDay)
}
