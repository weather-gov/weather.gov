package data

import (
	"fmt"
	"math"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

type Point struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type Place struct {
	Name       string `json:"name"`
	State      string `json:"state,omitempty"`
	StateName  string `json:"statename,omitempty"`
	County     string `json:"county,omitempty"`
	CountyFIPS string `json:"countyfips,omitempty"`
	StateFIPS  string `json:"statefips,omitempty"`
	Timezone   string `json:"timezone,omitempty"`
	FullName   string `json:"fullName,omitempty"`
}

type Grid struct {
	WFO          string      `json:"wfo"`
	X            int         `json:"x"`
	Y            int         `json:"y"`
	Geometry     interface{} `json:"geometry"`
	Error        bool        `json:"error,omitempty"`
	OutOfBounds  bool        `json:"outOfBounds,omitempty"`
	NotSupported bool        `json:"notSupported,omitempty"`
	Status       int         `json:"status,omitempty"`
}

type PointData struct {
	Point         Point            `json:"point"`
	Place         *Place           `json:"place"`
	Grid          *Grid            `json:"grid"`
	IsMarine      bool             `json:"isMarine"`
	Alerts        interface{}      `json:"alerts,omitempty"`
	Forecast      *ForecastResult  `json:"forecast,omitempty"`
	Observed      *ObsResult       `json:"observed,omitempty"`
	Satellite     *SatelliteResult `json:"satellite,omitempty"`
	RadarMetadata *RadarMetadata   `json:"radarMetadata,omitempty"`
}

// GetClosestPlace finds the nearest named place and its county/state
func GetClosestPlace(latitude, longitude float64) (*Place, error) {
	db, err := GetDBConnection()
	if err != nil {
		return nil, err
	}

	pointGeom := fmt.Sprintf("ST_GEOMFROMTEXT('POINT(%f %f)',%d)", longitude, latitude, SpatialProjectionWGS84)

	// Query Place
	var p Place
	err = db.QueryRow(fmt.Sprintf(`
		SELECT name, timezone
		FROM weathergov_geo_places
		ORDER BY ST_DISTANCE(point,%s)
		LIMIT 1`, pointGeom)).Scan(&p.Name, &p.Timezone)

	if err != nil {
		// If no rows, we return null in TS. Here nil.
		return nil, nil
	}

	// Query County/State
	// Note: We scan into nullable fields or handle errors? TS uses strict inner join.
	// If scan fails (no rows), just return place as is.
	var state, stateName, county, countyFips, stateFips string

	err = db.QueryRow(fmt.Sprintf(`
		SELECT
			c.countyname, c.countyfips,
			s.state, s.name, s.fips
		FROM weathergov_geo_counties c
		INNER JOIN weathergov_geo_states s ON (s.id=c.state_id)
		WHERE ST_Contains(c.shape, %s)
		LIMIT 1`, pointGeom)).Scan(&county, &countyFips, &state, &stateName, &stateFips)

	if err == nil {
		p.County = county
		p.CountyFIPS = countyFips
		p.State = state
		p.StateName = stateName
		p.StateFIPS = stateFips
	}

	if p.Name != "" && p.State != "" {
		p.FullName = fmt.Sprintf("%s, %s", p.Name, p.State)
	}

	return &p, nil
}

// GetPointData aggregates grid, place, and marine info
func GetPointData(latitude, longitude float64) (*PointData, error) {
	if math.Abs(latitude) > 90 || math.Abs(longitude) > 180 {
		return nil, fmt.Errorf("invalid coordinates")
	}

	point := Point{Latitude: latitude, Longitude: longitude}

	// 1. Fetch Grid (Async in TS, we can do sequential or goroutine)
	// TS does Promise.all. Let's do sequential for simplicity unless perf critical (it IS perf critical).
	// But `GetClosestPlace` involves DB which might block. `util_golang.FetchAPIJson` is HTTP.
	// Let's use channels for parallel execution.

	type gridResult struct {
		grid *Grid
		err  error
	}
	gridChan := make(chan gridResult, 1)

	go func() {
		path := fmt.Sprintf("/points/%f,%f", latitude, longitude)
		res, err := util_golang.FetchAPIJson(path)
		if err != nil {
			// Check if err is a structured fetch error?
			// util_golang.FetchAPIJson returns map[string]interface{} on error usually.
			// Re-read fetch.go: it returns result or error.
			// If 404/500, it returns map with error: true.
			// Only network errors return Go error object?
			// Let's assume err means hard fail, otherwise parse res.
			gridChan <- gridResult{nil, err}
			return
		}

		// Parse result
		data, ok := res.(map[string]interface{})
		if !ok {
			gridChan <- gridResult{nil, fmt.Errorf("invalid response format")}
			return
		}

		g := &Grid{}
		if val, ok := data["error"]; ok && val == true {
			g.Error = true
			if status, ok := data["status"].(float64); ok {
				g.Status = int(status)
				if g.Status == 404 {
					g.OutOfBounds = true
				}
			}
			// notSupported check (wfo is null)?
		} else {
			// Extract properties
			if props, ok := data["properties"].(map[string]interface{}); ok {
				if val, ok := props["gridId"].(string); ok {
					g.WFO = val
				}
				if val, ok := props["gridX"].(float64); ok {
					g.X = int(val)
				}
				if val, ok := props["gridY"].(float64); ok {
					g.Y = int(val)
				}
				g.Geometry = data["geometry"]
			}

			if g.WFO == "" {
				g.Error = true
				g.NotSupported = true
			}
		}
		gridChan <- gridResult{g, nil}
	}()

	// 2. Get Place (DB)
	place, err := GetClosestPlace(latitude, longitude)
	if err != nil {
		// Log error? TS does not seem to catch DB errors explicitly, just bubble up.
		return nil, err
	}

	// 3. Check Marine (DB)
	db, err := GetDBConnection()
	if err != nil {
		return nil, err
	}

	pointGeom := fmt.Sprintf("ST_GEOMFROMTEXT('POINT(%f %f)',%d)", longitude, latitude, SpatialProjectionWGS84)
	var marineID int
	// We just need to know if rows > 0
	err = db.QueryRow(fmt.Sprintf(`
		SELECT id FROM weathergov_geo_zones
		WHERE type LIKE 'marine:%%' AND ST_Intersects(shape,%s)
		LIMIT 1`, pointGeom)).Scan(&marineID)

	isMarine := (err == nil)

	// Wait for grid
	gRes := <-gridChan
	if gRes.err != nil {
		// Fallback for network failure?
		return nil, gRes.err
	}

	// 4. Parallel Fetches for Aggregrated Data
	// Channels
	alertCh := make(chan *AlertsResponse, 1)
	forecastCh := make(chan *ForecastResult, 1)
	obsCh := make(chan *ObsResult, 1) // Obs needs DB connection?
	satCh := make(chan *SatelliteResult, 1)

	// Alerts
	go func() {
		res, err := GetAlertsForPoint(db, latitude, longitude, place)
		if err != nil {
			alertCh <- nil
		} else {
			alertCh <- res
		}
	}()

	// Forecast
	go func() {
		if place != nil {
			res, _ := GetForecast(gRes.grid, place, isMarine)
			forecastCh <- res
		} else {
			forecastCh <- &ForecastResult{Error: true}
		}
	}()

	// Satellite
	go func() {
		if place != nil {
			res, _ := GetSatellite(gRes.grid, place)
			satCh <- res
		} else {
			satCh <- &SatelliteResult{Error: true}
		}
	}()

	// Obs
	go func() {
		if place != nil {
			res, _ := GetObs(gRes.grid, &point, place, db)
			obsCh <- res
		} else {
			obsCh <- &ObsResult{Error: true}
		}
	}()

	alerts := <-alertCh
	forecast := <-forecastCh
	obs := <-obsCh
	satellite := <-satCh

	// Assign Alerts to Forecast Days
	if forecast != nil && alerts != nil {
		AssignAlertsToDays(forecast, alerts)
	}

	return &PointData{
		Point:     point,
		Place:     place,
		Grid:      gRes.grid,
		IsMarine:  isMarine,
		Alerts:    alerts,
		Forecast:  forecast,
		Observed:  obs,
		Satellite: satellite,
	}, nil
}

func AssignAlertsToDays(forecast *ForecastResult, alerts *AlertsResponse) {
	if forecast.ForecastDailyResult == nil || len(forecast.ForecastDailyResult.Days) == 0 {
		return
	}

	for i := range forecast.ForecastDailyResult.Days {
		day := &forecast.ForecastDailyResult.Days[i]
		dayStart, _ := time.Parse(time.RFC3339, day.Start)
		dayEnd, _ := time.Parse(time.RFC3339, day.End)

		count := 0
		highest := ""
		minP := 9999999
		var dayAlerts []Alert

		for _, alert := range alerts.Items {
			if (alert.Onset.Before(dayEnd) || alert.Onset.Equal(dayEnd)) &&
				(alert.Finish.After(dayStart) || alert.Finish.Equal(dayStart)) {
				count++
				if alert.Metadata.Priority < minP {
					minP = alert.Metadata.Priority
					highest = alert.Metadata.Level
				}
				dayAlerts = append(dayAlerts, alert)
			}
		}

		if dayAlerts == nil {
			dayAlerts = []Alert{}
		}

		day.Alerts = &ForecastDayAlerts{
			Metadata: DayAlertsMetadata{
				Count:   count,
				Highest: highest,
			},
			Items: dayAlerts,
		}
	}
}
