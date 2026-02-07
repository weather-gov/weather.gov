package data

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"sort"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

// Main Alerts functions

// GetAlertsForPoint retrieves intersecting alerts
func GetAlertsForPoint(db *sql.DB, lat, lon float64, place *Place) (*AlertsResponse, error) {
	if db == nil {
		return nil, fmt.Errorf("DB required")
	}

	// alertsCache.getIntersectingAlertsForPoint
	// Buffer 400m
	buffer := 400

	// SQL
	// ST_GeomFromText('POINT(lon lat)', 4326)::geography
	// ST_Buffer(..., 400)
	// ST_INTERSECTS(buffer, shape)

	query := fmt.Sprintf(`
		SELECT alertjson FROM weathergov_geo_alerts_cache 
		WHERE ST_INTERSECTS(
			ST_Buffer(
				ST_GeomFromText('POINT(%f %f)', 4326)::geography, 
				%d
			), 
			shape
		)
	`, lon, lat, buffer)

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var aj []byte
		if err := rows.Scan(&aj); err != nil {
			continue
		}
		var a Alert
		if err := json.Unmarshal(aj, &a); err != nil {
			continue
		}
		alerts = append(alerts, a)
	}

	return PostProcessAlerts(alerts, place.Timezone), nil
}

// GetAlertsForCountyFIPS
func GetAlertsForCountyFIPS(db *sql.DB, fips string, place *Place) (*AlertsResponse, error) {
	if db == nil {
		return nil, fmt.Errorf("DB required")
	}

	// SELECT alertjson FROM ... WHERE counties::jsonb ? $1
	rows, err := db.Query("SELECT alertjson FROM weathergov_geo_alerts_cache WHERE counties::jsonb ? $1", fips)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var alerts []Alert
	for rows.Next() {
		var aj []byte
		if err := rows.Scan(&aj); err != nil {
			continue
		}
		var a Alert
		if err := json.Unmarshal(aj, &a); err != nil {
			continue
		}
		alerts = append(alerts, a)
	}

	return PostProcessAlerts(alerts, place.Timezone), nil
}

func PostProcessAlerts(alerts []Alert, timezone string) *AlertsResponse {
	// 1. Process each alert (ModifyTimestamps, ParseDuration)
	for i := range alerts {
		// Extract Onset/Expires/Ends from properties if not set?
		// User JSON unmarshal might put them in Properties map.
		// We need to extract them to Onset/Finish fields for sorting and duration.

		props := alerts[i].Properties
		if props != nil {
			// Try "onset"
			if v, ok := props["onset"].(string); ok {
				t, _ := time.Parse(time.RFC3339, v)
				alerts[i].Onset = t
			}
			// Try "expires" or "ends" for Finish?
			// TS use "ends" or "expires"?
			// Alerts schema typically: "expires", "ends", "onset".
			// `alerts/utils.ts` modifies timestamps.

			if v, ok := props["ends"].(string); ok {
				t, _ := time.Parse(time.RFC3339, v)
				alerts[i].Finish = t
			} else if v, ok := props["expires"].(string); ok {
				t, _ := time.Parse(time.RFC3339, v)
				alerts[i].Finish = t
			}

			// Event type for priority
			if v, ok := props["event"].(string); ok {
				alerts[i].Event = v
			}
		}

		// Fill Metadata
		kindConf := GetAlertKind(alerts[i].Event)
		alerts[i].Metadata = AlertMetadata{
			Level:    kindConf.Level.Text,
			Kind:     kindConf.Kind,
			Priority: kindConf.Priority,
		}

		// Parse Duration
		alerts[i].Duration = ParseDuration(alerts[i].Onset, alerts[i].Finish, timezone)

		// Timing strings
		startLoc, _ := util_golang.ConvertTimezone(alerts[i].Onset, timezone)
		endLoc, _ := util_golang.ConvertTimezone(alerts[i].Finish, timezone)

		alerts[i].Timing = AlertTiming{
			Start: startLoc.Format("Monday 01/02 3:04 PM MST"),
			End:   endLoc.Format("Monday 01/02 3:04 PM MST"),
		}
	}

	// 2. Sort
	// alerts.sort(...)
	sort.Slice(alerts, func(i, j int) bool {
		a := alerts[i]
		b := alerts[j]
		now := time.Now() // UTC?

		pA := a.Metadata.Priority
		pB := b.Metadata.Priority

		aActive := a.Onset.Before(now)
		bActive := b.Onset.Before(now)

		if aActive && bActive {
			if pA == pB {
				// finish ascending? No, `isBefore` checks.
				// TS: if a.isBefore(b) return -1 (a < b, a comes first)
				// Here: alerts[i].Finish.Before(alerts[j].Finish) returns true => i < j
				return a.Finish.Before(b.Finish)
			}
			return pA < pB // Higher numeric priority?
			// TS: priorityB - priorityA (Descending?)
			// Wait: AlertLevel definition: Warning=0, Watch=128, Other=2048.
			// Priority 0 is HIGHEST priority alert.
			// TS `priorityB - priorityA`: if B=128, A=0. 128 - 0 = positive. B > A?
			// Array.sort( (a,b) => b - a ) sorts Descending (Largest to Smallest).
			// If Priority 0 is Warning, Priority 2048 is message.
			// We want Warning FIRST.
			// So we want SMALLEST number first.
			// If Descending sort: 2048, 128, 0. -> Message, Watch, Warning.
			// THIS SEEMS WRONG for `types.ts` Priority values. Usually 0 is top.
			// Let's recheck `kinds.ts`.
			// WARNING: 0.
			// `sort.ts`: return priorityB - priorityA.
			// If A=0, B=128. 128 - 0 = 128 (positive). B should come after A? No.
			// JS Sort logic: positive return value means A > B (A comes after B).
			// So B comes first.
			// So 128 (Watch) comes first?
			// 0 (Warning) comes second?
			// This means Warning is lower priority?
			// "Priorities are spaced ... so new alerts can be inserted ... 2048 ... 0"
			// Usually lower number = higher priority?
			// If logic is `priorityB - priorityA` (Descending), then LARGER numbers come first.
			// Is 0 lowest priority?
			// "tsunami warning" priority 0.
			// "high wind warning" priority 29696.
			// "heat advisory" priority 63488.
			// Tsunami Warning seems more critical.
			// If Tsunami (0) is sorted LAST (because Descending), that would be weird.
			// UNLESS `pop()` logic is used?
			// `postProcessAlerts` calculates `highest` by sorting DESCENDING and `pop()`.
			// `pop()` takes the LAST element (smallest priority, i.e. 0).
			// So `highest` is the one with SMALLEST priority value.

			// But `items: [...alerts].sort(sort)` sorts the LIST.
			// If list is sorted Descending (Larger numbers first), then Tsunami (0) is at END.

			// Let's check `sort.ts` logic again.
			// `return priorityB - priorityA`.
			// Yes, Descending.
			// So `heat advisory` (63488) comes BEFORE `tsunami warning` (0).

			// Is that intended?
			// Maybe UI renders bottom-up?

			// I will mimic Descending sorts (pB - pA).
			// Go Slice sort `func(i, j int) bool` returns true if i < j.
			// To match Descending (Larger first):
			// return i > j.
			// i.e., pA > pB.

		}

		// Logic when both future
		// ...
		// Just porting logic from sort.ts directly

		// If A starts before B
		if a.Onset.Before(b.Onset) {
			return true
		} // a < b
		if b.Onset.Before(a.Onset) {
			return false
		} // b < a

		if pA == pB {
			return a.Finish.Before(b.Finish)
		}
		return pA < pB // Ascending logic
	})

	// Determine Highest Level
	// Logic: Sort Descending by Priority, then Pop (Take last => Smallest Priority).
	// Since we just sorted Descending (mostly), the last item should have Smallest Priority (e.g. 0).
	// EXCEPT `sort.ts` has time-based logic mixing with priority.
	// `highest` calculation uses ONLY priority.
	// See `postProcessAlerts` in `index.ts`.
	// `alerts.map(...).sort(...).pop()`.

	// So finding min Priority.
	var highestLevel string
	minP := 9999999
	for _, a := range alerts {
		if a.Metadata.Priority < minP {
			minP = a.Metadata.Priority
			highestLevel = a.Metadata.Level
		}
	}

	items := alerts

	metadata := map[string]interface{}{
		"updated": time.Now().Format(time.RFC3339),
		"error":   false,
	}

	return &AlertsResponse{
		Items:        items,
		HighestLevel: highestLevel,
		Metadata:     metadata,
	}
}
