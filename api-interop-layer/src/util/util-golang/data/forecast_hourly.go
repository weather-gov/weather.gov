package data

import (
	"sort"
	"time"
	util_golang "weathergov/util-golang"
)

func ForecastHourly(data *ForecastDailyResponse, hours map[string]*HourData, place *Place) {
	if data.Error {
		return
	}

	for _, period := range data.Properties.Periods {
		// Period Start/End
		// TS: dayjs(period.startTime).tz(timezone)
		// Assuming startTime is RFC3339
		t1, _ := time.Parse(time.RFC3339, period.StartTime)
		start, _ := util_golang.ConvertTimezone(t1, place.Timezone)

		t2, _ := time.Parse(time.RFC3339, period.EndTime)
		end, _ := util_golang.ConvertTimezone(t2, place.Timezone)

		// Loop while start < end
		for start.Before(end) {
			// truncate to hour
			ts := start.Truncate(time.Hour)
			timeKey := ts.Format(time.RFC3339)

			hourData, exists := hours[timeKey]
			if !exists {
				hourData = &HourData{
					Time:       ts,
					Properties: make(map[string]interface{}),
				}
				hours[timeKey] = hourData
			}

			// Populate fields
			hourData.Properties["shortForecast"] = util_golang.SentenceCase(period.ShortForecast)

			// parseAPIIcon
			iconRes := util_golang.ParseAPIIcon(period.Icon) // struct pointer? No, struct default
			// In Go I can't assign struct to map interface directly if I want it to behave like JS object
			// util_golang.ParseAPIIcon returns IconResult struct.
			// Map values:
			if iconRes.Icon != nil {
				// TS sets properties directly?
				// hourly.ts: hourData.icon = parseAPIIcon(...)
				// so it puts the object result.
				hourData.Properties["icon"] = iconRes
			}

			// Advance 1 hour
			start = start.Add(time.Hour)
		}
	}
}

// SortAndFilterHours
func SortAndFilterHours(hoursMap map[string]*HourData, earliest time.Time) []*HourData {
	// align earliest
	alignedEarliest := earliest.Truncate(time.Hour)

	validHours := []*HourData{}

	for _, h := range hoursMap {
		if !h.Time.Before(alignedEarliest) {
			validHours = append(validHours, h)
		}
	}

	// Sort
	sort.Slice(validHours, func(i, j int) bool {
		return validHours[i].Time.Before(validHours[j].Time)
	})

	return validHours
}
