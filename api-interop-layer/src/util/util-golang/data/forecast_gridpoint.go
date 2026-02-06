package data

import (
	"encoding/json"
	"strings"
	"time"
	util_golang "weathergov/util-golang"
)

type GridpointResult struct {
	Geometry interface{}              `json:"geometry"`
	QPF      []map[string]interface{} `json:"qpf"`
	Error    bool                     `json:"error,omitempty"`
}

func ForecastGridpoint(data *GridpointResponse, hours map[string]*HourData, place *Place) (*GridpointResult, error) {
	if data.Error {
		return &GridpointResult{Error: true}, nil // Return with error flag logic or just nil? TS returns {error: true}
	}
	// TS: returns {error: true} which caller checks.
	// But generic return interface?
	// Let's use GridpointResult but maybe with error field if needed?
	// Or just nil. TS code: `if (data.error) return { error: true }`.
	// My struct has no error field. I should add `Error bool` to `GridpointResult`?
	// Or just return nil.

	// Extract QPF, Ice, Snow
	var qpfProp, iceProp, snowProp *GridpointProperty

	if val, ok := data.Properties["quantitativePrecipitation"]; ok {
		_ = json.Unmarshal(val, &qpfProp)
		delete(data.Properties, "quantitativePrecipitation")
	}
	if val, ok := data.Properties["iceAccumulation"]; ok {
		_ = json.Unmarshal(val, &iceProp)
	}
	if val, ok := data.Properties["snowfallAmount"]; ok {
		_ = json.Unmarshal(val, &snowProp)
	}

	qpf := QuantitativePrecipitation(qpfProp, iceProp, snowProp, place)

	// Process other properties
	for key, raw := range data.Properties {
		var prop GridpointProperty
		if err := json.Unmarshal(raw, &prop); err != nil {
			continue
		}

		if prop.Uom == "" || prop.Values == nil {
			continue
		}

		for _, val := range prop.Values {
			parts := strings.Split(val.ValidTime, "/")
			if len(parts) != 2 {
				continue
			}
			isoTimestamp := parts[0]
			isoDuration := parts[1]

			t, err := time.Parse(time.RFC3339, isoTimestamp)
			if err != nil {
				continue
			}
			start, _ := util_golang.ConvertTimezone(t, place.Timezone)

			dur, err := ParseISODuration(isoDuration)
			if err != nil {
				continue
			}

			durationHours := int(dur.Hours())

			// TS: loop offset < duration
			for offset := 0; offset < durationHours; offset++ {
				ts := start.Add(time.Duration(offset) * time.Hour)
				// Truncate to hour? TS: .startOf("hour")
				ts = ts.Truncate(time.Hour)

				timeKey := ts.Format(time.RFC3339)

				hourData, exists := hours[timeKey]
				if !exists {
					hourData = &HourData{
						Time:       ts,
						Properties: make(map[string]interface{}),
					}
					hours[timeKey] = hourData
				}

				hourData.Properties[key] = map[string]interface{}{
					"uom":   prop.Uom,
					"value": val.Value,
				}
			}
		}
	}

	return &GridpointResult{
		Geometry: data.Geometry,
		QPF:      qpf,
	}, nil
}
