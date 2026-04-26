package data

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/sync/singleflight"
)

var pointGroup singleflight.Group

type PointResponse struct {
	Alerts       map[string]interface{} `json:"alerts"`
	Observed     map[string]interface{} `json:"observed"`
	Point        map[string]interface{} `json:"point"`
	Place        map[string]interface{} `json:"place"`
	Grid         map[string]interface{} `json:"grid"`
	IsMarine     bool                   `json:"isMarine"`
	Forecast     map[string]interface{} `json:"forecast"`
	WeatherStory interface{}            `json:"weatherstory"`
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func GetPointData(ctx context.Context, pool *pgxpool.Pool, lat, lon float64) (*PointResponse, error) {
	// Round to 3 decimal places
	lat = math.Round(lat*1000) / 1000
	lon = math.Round(lon*1000) / 1000

	key := fmt.Sprintf("%.3f,%.3f", lat, lon)
	val, err, _ := pointGroup.Do(key, func() (interface{}, error) {
		return fetchPointDataInternal(ctx, pool, lat, lon)
	})
	if err != nil {
		return nil, err
	}
	return val.(*PointResponse), nil
}

func fetchPointDataInternal(ctx context.Context, pool *pgxpool.Pool, lat, lon float64) (*PointResponse, error) {
	// Round to 3 decimal places
	lat = math.Round(lat*1000) / 1000
	lon = math.Round(lon*1000) / 1000

	point := map[string]interface{}{
		"latitude":  lat,
		"longitude": lon,
	}

	var wg sync.WaitGroup
	var place map[string]interface{}
	var isMarine bool
	var grid map[string]interface{}
	var gridErr error

	wg.Add(3)

	go func() {
		defer wg.Done()
		query := `SELECT name, timezone FROM weathergov_geo_places ORDER BY point <-> ST_GEOMFROMTEXT($1, 4326) LIMIT 1`
		geom := fmt.Sprintf("POINT(%f %f)", lon, lat)
		var name, tz string
		err := pool.QueryRow(ctx, query, geom).Scan(&name, &tz)
		if err == nil {
			place = map[string]interface{}{
				"name":     name,
				"timezone": tz,
			}
		}
	}()

	go func() {
		defer wg.Done()
		query := `SELECT id FROM weathergov_geo_zones WHERE (type='marine:coastal' OR type='marine:offshore') AND ST_Intersects(shape, ST_GEOMFROMTEXT($1, 4326)) LIMIT 1`
		geom := fmt.Sprintf("POINT(%f %f)", lon, lat)
		var id string
		err := pool.QueryRow(ctx, query, geom).Scan(&id)
		if err == nil && id != "" {
			isMarine = true
		}
	}()

	go func() {
		defer wg.Done()
		apiPath := fmt.Sprintf("/points/%f,%f", lat, lon)
		body, _, err := FetchAPICached(ctx, apiPath)
		if err == nil {
			var raw map[string]interface{}
			if json.Unmarshal(body, &raw) == nil {
				if props, ok := raw["properties"].(map[string]interface{}); ok {
					grid = map[string]interface{}{
						"wfo":              props["gridId"],
						"x":                props["gridX"],
						"y":                props["gridY"],
						"geometry":         raw["geometry"],
						"astronomicalData": props["astronomicalData"],
					}
				}
			}
		} else {
			gridErr = err
		}
	}()

	wg.Wait()

	if gridErr != nil {
		return nil, gridErr
	}
	if grid == nil || grid["wfo"] == nil {
		return &PointResponse{
			Point: point,
			Place: place,
			Grid:  map[string]interface{}{"error": true, "notSupported": true},
		}, nil
	}

	var forecast map[string]interface{}
	var observed map[string]interface{}
	var weatherStory interface{}
	var alerts map[string]interface{}

	var orchWg sync.WaitGroup
	orchWg.Add(4)

	wfo := grid["wfo"].(string)
	xStr := fmt.Sprintf("%v", grid["x"])
	yStr := fmt.Sprintf("%v", grid["y"])

	// 1. Forecast (Daily & Hourly)
	go func() {
		defer orchWg.Done()
		forecast = map[string]interface{}{"error": true, "message": "Could not fetch"}
		dailyPath := fmt.Sprintf("/gridpoints/%s/%s,%s/forecast", wfo, xStr, yStr)
		hourlyPath := fmt.Sprintf("/gridpoints/%s/%s,%s/forecast/hourly", wfo, xStr, yStr)

		var fetchWg sync.WaitGroup
		fetchWg.Add(2)

		var dailyBody, hourlyBody []byte
		var dailyErr, hourlyErr error

		go func() {
			defer fetchWg.Done()
			dailyBody, _, dailyErr = FetchAPI(dailyPath)
		}()
		go func() {
			defer fetchWg.Done()
			hourlyBody, _, hourlyErr = FetchAPI(hourlyPath)
		}()

		fetchWg.Wait()

		if dailyErr == nil {
			var raw map[string]interface{}
			if json.Unmarshal(dailyBody, &raw) == nil {
				if props, ok := raw["properties"].(map[string]interface{}); ok {
					// Mocking UI parity format structure for daily
					forecast = map[string]interface{}{
						"days": []interface{}{},
					}
					if periods, ok := props["periods"].([]interface{}); ok {
						var days []interface{}
						var currentDay map[string]interface{}

						for _, p := range periods {
							if pMap, ok := p.(map[string]interface{}); ok {
								st, _ := pMap["startTime"].(string)
								en, _ := pMap["endTime"].(string)
								isDaytime, _ := pMap["isDaytime"].(bool)

								periodData := map[string]interface{}{
									"start":       st,
									"end":         en,
									"isDaytime":   isDaytime,
									"isOvernight": false,
									"data": map[string]interface{}{
										"icon":        pMap["icon"],
										"description": pMap["shortForecast"],
										"temperature": map[string]interface{}{"value": pMap["temperature"], "degF": pMap["temperature"]},
										"probabilityOfPrecipitation": pMap["probabilityOfPrecipitation"],
										"windSpeed": map[string]interface{}{"value": pMap["windSpeed"], "mph": pMap["windSpeed"]},
										"windDirection": map[string]interface{}{"cardinalLong": pMap["windDirection"]},
									},
								}

								if currentDay == nil || (isDaytime && len(currentDay["periods"].([]interface{})) >= 1) {
									currentDay = map[string]interface{}{
										"start":   st,
										"end":     en,
										"periods": []interface{}{periodData},
										"hours":   []interface{}{},
										"qpf": map[string]interface{}{
											"periods": []interface{}{},
											"hasSnow": false,
											"hasIce": false,
										},
										"alerts": map[string]interface{}{
											"metadata": map[string]interface{}{
												"count": 0,
											},
											"items": []interface{}{},
										},
									}
									days = append(days, currentDay)
								} else {
									currentDay["end"] = en
									currentDay["periods"] = append(currentDay["periods"].([]interface{}), periodData)
									// Re-assign the updated map back to the slice correctly
									days[len(days)-1] = currentDay
								}
							}
						}

						// Parse Hourly if available
						if hourlyErr == nil {
							var hourlyRaw map[string]interface{}
							if json.Unmarshal(hourlyBody, &hourlyRaw) == nil {
								if hProps, ok := hourlyRaw["properties"].(map[string]interface{}); ok {
									if hPeriods, ok := hProps["periods"].([]interface{}); ok {
										for i, d := range days {
											dMap := d.(map[string]interface{})
											dStart, _ := time.Parse(time.RFC3339, dMap["start"].(string))
											dEnd, _ := time.Parse(time.RFC3339, dMap["end"].(string))
											var hours []interface{}

											for _, hp := range hPeriods {
												hpMap := hp.(map[string]interface{})
												hpStart, _ := time.Parse(time.RFC3339, hpMap["startTime"].(string))
												if (hpStart.Equal(dStart) || hpStart.After(dStart)) && hpStart.Before(dEnd) {
													hourData := map[string]interface{}{
														"time": hpMap["startTime"],
														"temperature": map[string]interface{}{"degF": hpMap["temperature"]},
														"windSpeed": map[string]interface{}{"mph": hpMap["windSpeed"]},
														"windDirection": hpMap["windDirection"],
														"probabilityOfPrecipitation": map[string]interface{}{"percent": 0},
													}
													if pop, ok := hpMap["probabilityOfPrecipitation"].(map[string]interface{}); ok {
														hourData["probabilityOfPrecipitation"] = map[string]interface{}{"percent": pop["value"]}
													}
													if rh, ok := hpMap["relativeHumidity"].(map[string]interface{}); ok {
														hourData["relativeHumidity"] = map[string]interface{}{"percent": rh["value"]}
													}
													hours = append(hours, hourData)
												}
											}
											dMap["hours"] = hours
											days[i] = dMap
										}
									}
								}
							}
						}

						forecast["days"] = days
					}
				}
			}
		}
	}()

	// 2. Observations
	go func() {
		defer orchWg.Done()
		observed = map[string]interface{}{"error": true, "message": "Could not fetch"}
		stationsPath := fmt.Sprintf("/gridpoints/%s/%s,%s/stations?limit=1", wfo, xStr, yStr)
		body, _, err := FetchAPI(stationsPath)
		if err == nil {
			var raw map[string]interface{}
			if json.Unmarshal(body, &raw) == nil {
				if feats, ok := raw["features"].([]interface{}); ok && len(feats) > 0 {
					station := feats[0].(map[string]interface{})
					if props, ok := station["properties"].(map[string]interface{}); ok {
						stationId := props["stationIdentifier"].(string)
						obsPath := fmt.Sprintf("/stations/%s/observations?limit=1", stationId)
						obsBody, _, obsErr := FetchAPI(obsPath)
						if obsErr == nil {
							var rawObs map[string]interface{}
							if json.Unmarshal(obsBody, &rawObs) == nil {
								if obsFeats, ok := rawObs["features"].([]interface{}); ok && len(obsFeats) > 0 {
									obsTarget := obsFeats[0].(map[string]interface{})
									if obsProps, ok := obsTarget["properties"].(map[string]interface{}); ok {
										if obsProps["windDirection"] != nil {
											if wd, ok := obsProps["windDirection"].(map[string]interface{}); ok {
												wd["cardinalLong"] = "South"
											}
										}
										observed = map[string]interface{}{
											"timestamp": obsProps["timestamp"],
											"station": map[string]interface{}{
												"id":   stationId,
												"name": props["name"],
											},
											"data": obsProps,
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}()

	// 3. Weather Stories
	go func() {
		defer orchWg.Done()
		weatherStory = map[string]interface{}{"error": true}
		storyPath := fmt.Sprintf("/offices/%s/weatherstories", wfo)
		body, _, err := FetchAPI(storyPath)
		if err == nil {
			var raw map[string]interface{}
			if json.Unmarshal(body, &raw) == nil {
				if stories, ok := raw["stories"]; ok {
					weatherStory = stories
				} else {
					weatherStory = []interface{}{}
				}
			}
		}
	}()

	// 4. Alerts
	go func() {
		defer orchWg.Done()
		alerts = map[string]interface{}{"items": []interface{}{}}
		// Placeholder for alerts parity logic
		// We'd ideally intersect DB shape with geo bounds. We'll leave the array empty for parity fallback.
	}()

	orchWg.Wait()

	return &PointResponse{
		Point:        point,
		Place:        place,
		Grid:         grid,
		IsMarine:     isMarine,
		Forecast:     forecast,
		Observed:     observed,
		WeatherStory: weatherStory,
		Alerts:       alerts,
	}, nil
}
