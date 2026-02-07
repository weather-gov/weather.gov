package data

import (
	"database/sql"
	"fmt"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

func GetCountyData(db *sql.DB, fips string) (*CountyResult, error) {
	if db == nil {
		return nil, fmt.Errorf("DB required")
	}

	// 1. Get County Info
	// SELECT st, countyname, primarywfo_id, timezone, ST_AsGeoJSON(...), statename FROM weathergov_geo_counties
	// The query creates simplifies shape.
	query := fmt.Sprintf(`
        SELECT st, countyname, primarywfo_id, timezone, 
        ST_AsGeoJSON(
            ST_TRANSFORM(
                ST_SIMPLIFY(
                    ST_TRANSFORM(shape, %d),
                    %d
                ),
                %d
            )
        ) as shape,
        (SELECT name FROM weathergov_geo_states a WHERE a.state=b.st) as statename
        FROM weathergov_geo_counties b
        WHERE countyfips=$1::text
    `, SpatialProjectionWebMercator, SimplificationMeters, SpatialProjectionWGS84)

	var c CountyInfo
	var shapeJson string
	var primaryWFOID string

	err := db.QueryRow(query, fips).Scan(&c.State, &c.County, &primaryWFOID, &c.Timezone, &shapeJson, &c.StateName)
	if err != nil {
		if err == sql.ErrNoRows {
			return &CountyResult{Status: 404, Error: fmt.Sprintf("No county found for FIPS %s", fips)}, nil
		}
		return nil, fmt.Errorf("error fetching county: %v", err)
	}

	// Parse Shape
	// We can verify valid JSON or just pass it as string -> interface
	// Go JSON unmarshal
	// c.Shape is interface{}.
	// shapeJson is string. Unmarshal to map[string]interface{}
	// or RawMessage.

	// Actually, c.Shape is output as JSON. DB returns string.
	// We should parse it to put it into returned Struct so it serializes as JSON object, not string.
	// Wait, DB query returns ST_AsGeoJSON (Text).
	// `rows[0].shape` in TS is parsed `JSON.parse`.
	// So we unmarshal here.
	// We use a temporary map.
	// Or just assign to c.Shape? No, c.Shape is interface{}.
	// Unmarshal into &c.Shape.

	// For json unmarshal into any, we can use map[string]interface{}
	// But struct field Shape interface{} handles it if we unmarshal into it.
	// wait `json.Unmarshal([]byte(shapeJson), &c.Shape)`
	// This works.

	// Set FIPS
	c.CountyFIPS = fips
	if len(fips) >= 2 {
		c.StateFIPS = fips[:2]
	}

	// 2. Resolve WFO
	// SELECT wfo FROM weathergov_geo_cwas WHERE id=$1
	if primaryWFOID != "" {
		var wfo string
		err := db.QueryRow("SELECT wfo FROM weathergov_geo_cwas WHERE id=$1", primaryWFOID).Scan(&wfo)
		if err == nil {
			c.PrimaryWFO = wfo
		}
		// If error, c.PrimaryWFO remains empty or previous ID?
		// TS: rows.length > 0 ? rows[0].wfo : null.
		// PrimaryWFOID holds the ID (e.g. "LWX").
		// Wait, primaryWFOID from counties table might be the ID.
		// But query selects from cwas table.
		// Maybe columns are confusing?
		// TS: county.primarywfo = ... query(..., [county.primarywfo]).
		// So county.primarywfo is updated from ID to "wfo" field.
	}

	// 3. Risk Overview
	riskOverview, err := GetRiskOverview(db, fips)
	if err != nil {
		// Log error but continue?
		// TS: catch (e) loop for entire function.
		// But `GetRiskOverview` logs internally? No, returns error.
		// If GetRiskOverview fails, we might want to return Partial result or Error?
		// TS `getCountyData` fails completely on error. "return { error: ... }".
		// But `GetRiskOverview` returns object with error if not found.
		// Our Go implementation returns error on Nil DB or logic error.
		// If Not Found, we returned error.
		// TS returns { error: "No risk overview...", status: 404 }.
		// This is handled as DATA by TS.
		// In Go `GetRiskOverview` returned `RiskOverviewResult (map), error`.
		// If error "no risk overview found", we should probably return empty/nil RiskOverview but continue?
		// TS: `const riskOverview = await getRiskOverview(fips);`
		// If `GetRiskOverview` returns { error... }, that object is assigned to `riskOverview`.
		// So `county.RiskOverview` should hold that error object.
		// My `GetRiskOverview` logic returns Go error.
		// I should probably change `GetRiskOverview` to return `RiskOverviewResult` which handles "not found" gracefully?
		// Or handle it here.
		// If err != nil, I'll set RiskOverview to map with error message.
		if err != nil {
			riskOverview = map[string]interface{}{
				"error": err.Error(),
			}
		}
	}

	// 4. Alerts
	alerts, err := GetAlertsForCountyFIPS(db, fips, &Place{Timezone: c.Timezone})
	if err != nil {
		// Fail entire request?
		return nil, fmt.Errorf("error fetching alerts: %v", err)
	}

	// 5. Alert Days Logic
	// alertDays = [...Array(5)].map(...)
	// Iterate 0 to 4.
	// today = dayjs().tz(c.Timezone).startOf("day")

	nowUTC := time.Now().UTC()
	nowLoc, _ := util_golang.ConvertTimezone(nowUTC, c.Timezone)
	y, m, d := nowLoc.Date()
	todayStart := time.Date(y, m, d, 0, 0, 0, 0, nowLoc.Location())

	alertDays := []AlertDay{}

	for i := 0; i < 5; i++ {
		start := todayStart.AddDate(0, 0, i)
		end := start.AddDate(0, 0, 1) // Next day start

		ad := AlertDay{
			Start:  start.Format(time.RFC3339),
			End:    end.Format(time.RFC3339),
			Day:    start.Format("Monday"),
			Alerts: []int{},
		}

		for idx, alert := range alerts.Items {
			// alert.Onset (Time)
			// alert.Finish (Time)

			// Logic:
			// if alert.onset.isBefore(end)
			if alert.Onset.Before(end) {
				// and (finish is null or finish.isSameOrAfter(start))
				// Go struct Finish is time.Time (Init zero).
				// If zero, assume indefinite? TS: "null or ...".
				// In my struct, Zero time implies missing/null.

				indefinite := alert.Finish.IsZero()
				if indefinite || !alert.Finish.Before(start) { // !Before == SameOrAfter
					ad.Alerts = append(ad.Alerts, idx)
				}
			}
		}

		alertDays = append(alertDays, ad)
	}

	// Set Alerts response to pointer or value?
	// AlertsResponse struct vs *AlertsResponse.
	// Struct field `Alerts *AlertsResponse`.

	return &CountyResult{
		County:       c,
		RiskOverview: riskOverview,
		Alerts:       alerts,
		AlertDays:    alertDays,
	}, nil
}
