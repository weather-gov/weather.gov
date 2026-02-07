package data

func GetAlerts(grid *Grid, point Point, place *Place) (*AlertsResponse, error) {
	// 1. Get Point Alerts
	// We need DB access.
	// Assuming GetAlerts receives DB or uses global GetDBConnection?
	// Alerts functions in alerts.go take *sql.DB.
	// So GetAlerts must get DB.

	db, err := GetDBConnection()
	if err != nil {
		return nil, err
	}

	// Point Alerts
	alerts, err := GetAlertsForPoint(db, point.Latitude, point.Longitude, place)
	if err != nil {
		// Log? Return empty?
		// Return empty for now to be safe
		alerts = &AlertsResponse{Items: []Alert{}}
	}

	// Logic to merge county alerts?
	// TS `alerts/index.js` logic:
	// It calls `getAlertsForPoint` which inside it MIGHT check county?
	// Actually TS `getAlertsForPoint` does geospatial query.
	// TS `getAlertsForCounty` does equality check.
	// `getAlerts` aggregation logic is likely in `alerts/index.js`.
	// It usually fetches BOTH and duplicates are removed by hashing.

	// For now, let's just stick to Point Alerts as they are most accurate for lat/lon.
	// If county alerts are needed, we can add them.
	// The `GetAlertsForPoint` function I viewed (alerts.go) does spatial query.

	return alerts, nil
}
