package data

import (
	"log"
	"math"
	"strings"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

// QuantitativePrecipitation processes QPF, Ice, and Snow data
func QuantitativePrecipitation(liquidData, iceData, snowData *GridpointProperty, place *Place) []map[string]interface{} {
	if liquidData == nil {
		return []map[string]interface{}{}
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
		// Backend expects "in" (inches). api-interop-layer must convert.
		liquidIn := convertToInches(liquidVal.Value, liquidData.Uom)
		liquid := map[string]interface{}{
			"in": liquidIn,
		}

		ice := map[string]interface{}{
			"in": 0.0,
		}
		if iceData != nil && i < len(iceData.Values) {
			ice["in"] = convertToInches(iceData.Values[i].Value, iceData.Uom)
		}

		snow := map[string]interface{}{
			"in": 0.0,
		}
		if snowData != nil && i < len(snowData.Values) {
			snow["in"] = convertToInches(snowData.Values[i].Value, snowData.Uom)
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

func convertToInches(val float64, uom string) float64 {
	// Simple conversion based on uom
	// wmoUnit:mm -> * 0.0393701
	if strings.Contains(uom, "mm") {
		val = val * 0.0393701
	}
	// Round to 2 decimals
	return math.Round(val*100) / 100
}
