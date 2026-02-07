package data

import (
	"log"
	"strings"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

// QuantitativePrecipitation processes QPF, Ice, and Snow data
func QuantitativePrecipitation(liquidData, iceData, snowData *GridpointProperty, place *Place) []map[string]interface{} {
	if liquidData == nil {
		return []map[string]interface{}{}
	}

	liquidUnits := liquidData.Uom
	// ice/snow might be nil, use safe defaults
	iceUnits := ""
	if iceData != nil {
		iceUnits = iceData.Uom
	}
	snowUnits := ""
	if snowData != nil {
		snowUnits = snowData.Uom
	}

	results := []map[string]interface{}{}

	for i, liquidVal := range liquidData.Values {
		parts := strings.Split(liquidVal.ValidTime, "/")
		if len(parts) != 2 {
			continue
		}

		isoTimestamp := parts[0]
		isoDuration := parts[1]

		// Parse Start Time
		t, err := time.Parse(time.RFC3339, isoTimestamp)
		if err != nil {
			log.Printf("Error parsing time %s: %v", isoTimestamp, err)
			continue
		}

		start, _ := util_golang.ConvertTimezone(t, place.Timezone)

		// Duration
		dur, err := ParseISODuration(isoDuration)
		if err != nil {
			log.Printf("Error parsing duration %s: %v", isoDuration, err)
			continue
		}

		end := start.Add(dur)
		end, _ = util_golang.ConvertTimezone(end, place.Timezone)

		// Build Objects
		liquid := map[string]interface{}{
			"uom":   liquidUnits,
			"value": liquidVal.Value,
		}

		ice := map[string]interface{}{
			"uom":   iceUnits,
			"value": nil, // default nil
		}
		if iceData != nil && i < len(iceData.Values) {
			ice["value"] = iceData.Values[i].Value
		}

		snow := map[string]interface{}{
			"uom":   snowUnits,
			"value": nil,
		}
		if snowData != nil && i < len(snowData.Values) {
			snow["value"] = snowData.Values[i].Value
		}

		results = append(results, map[string]interface{}{
			"start":  start.Format(time.RFC3339),
			"end":    end.Format(time.RFC3339),
			"liquid": liquid,
			"ice":    ice,
			"snow":   snow,
		})
	}

	return results
}
