package data

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CountyResponse struct {
	County         map[string]interface{} `json:"county"`
	RiskOverview   map[string]interface{} `json:"riskOverview"`
	Alerts         map[string]interface{} `json:"alerts"`
	AlertDays      []interface{}          `json:"alertDays"`
	WeatherStories []interface{}          `json:"weatherstories"`
	Briefings      []interface{}          `json:"briefings"`
}

func GetCountyData(ctx context.Context, pool *pgxpool.Pool, fips string) (*CountyResponse, error) {
	// 1. Fetch County Geometry and WFOs
	countyQuery := `
        SELECT st as state,
          countyname as county,
          primarywfo_id as primarywfo,
          timezone,
          ST_AsGeoJSON(
            ST_TRANSFORM(
              ST_SIMPLIFY(
                ST_TRANSFORM(
                  shape,
                  3857
                ),
                1000
              ),
              4326
            )
          ) AS shape,
          (SELECT name FROM weathergov_geo_states a WHERE a.state=b.st) as statename,
          ARRAY(SELECT cwas.wfo as wfo  FROM weathergov_geo_cwas cwas
                       JOIN weathergov_geo_counties_cwas jt ON cwas.id=jt.weathercountywarningareas_id
                       JOIN weathergov_geo_counties as counties ON jt.weathercounties_id=counties.id
                       WHERE counties.countyfips=$1::text) as wfos
        FROM weathergov_geo_counties b
        WHERE countyfips=$1::text`

	var county map[string]interface{} = make(map[string]interface{})
	var state, countyName, timezone, shapeStr, statename string
	var primaryWfoID int
	var wfos []string

	err := pool.QueryRow(ctx, countyQuery, fips).Scan(&state, &countyName, &primaryWfoID, &timezone, &shapeStr, &statename, &wfos)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("No county found for FIPS %s", fips)
		}
		return nil, fmt.Errorf("Error fetching county data: %v", err)
	}

	var shape map[string]interface{}
	json.Unmarshal([]byte(shapeStr), &shape)
	
	county["state"] = state
	county["county"] = countyName
	county["timezone"] = timezone
	county["shape"] = shape
	county["statename"] = statename
	county["wfos"] = wfos
	county["countyfips"] = fips
	if len(fips) >= 2 {
		county["statefips"] = fips[:2]
	}

	// 2. primarywfo
	var primarywfo string
	err = pool.QueryRow(ctx, `SELECT wfo FROM weathergov_geo_cwas WHERE id=$1`, primaryWfoID).Scan(&primarywfo)
	if err == nil {
		county["primarywfo"] = primarywfo
	}

	var wg sync.WaitGroup
	var riskOverview map[string]interface{}
	var alerts map[string]interface{} = map[string]interface{}{"items": []interface{}{}, "highestLevel": nil}
	var alertDays []interface{} = []interface{}{}
	var weatherStories []interface{} = []interface{}{}
	var briefings []interface{} = []interface{}{}

	wg.Add(2)

	// Fetch Risk Overview
	go func() {
		defer wg.Done()
		var roData string
		err := pool.QueryRow(ctx, "SELECT data FROM weathergov_temp_ghwo WHERE id=$1::text", fips).Scan(&roData)
		if err == nil {
			var parsed map[string]interface{}
			if json.Unmarshal([]byte(roData), &parsed) == nil {
				riskOverview = parsed
			}
		} else {
			riskOverview = map[string]interface{}{"error": "No risk overview found"}
		}
	}()

	// Fetch Alerts
	go func() {
		defer wg.Done()
		rows, err := pool.Query(ctx, "SELECT alertjson FROM weathergov_geo_alerts_cache WHERE counties::jsonb ? $1", fips)
		if err == nil {
			var alertItems []interface{}
			for rows.Next() {
				var ajson string
				if err := rows.Scan(&ajson); err == nil {
					var rawAlert map[string]interface{}
					if json.Unmarshal([]byte(ajson), &rawAlert) == nil {
						// Here we'd add timezone handling, but for now we just pass through
						// (Phase 3B allows iterative enrichment)
						rawAlert["alertDays"] = []int{}
						alertItems = append(alertItems, rawAlert)
					}
				}
			}
			alerts["items"] = alertItems
		}
	}()
	
	// We'll eventually fetch briefings and weather stories in parallel via HTTP, left decoupled for Phase 3C

	wg.Wait()

	// 5 days Mock Alert Days (simulating JS output exactly for parity to allow UI logic)
	today := time.Now().UTC() // Simulating timezone for structure output
	for i := 0; i < 5; i++ {
		start := today.AddDate(0, 0, i)
		alertDays = append(alertDays, map[string]interface{}{
			"day":    start.Format("Monday"),
			"alerts": []int{},
		})
	}

	resp := &CountyResponse{
		County:         county,
		RiskOverview:   riskOverview,
		Alerts:         alerts,
		AlertDays:      alertDays,
		WeatherStories: weatherStories,
		Briefings:      briefings,
	}

	return resp, nil
}
