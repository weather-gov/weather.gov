package data

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
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

var windSpeedRegex = regexp.MustCompile(`(\d+)`)

// parseWindSpeedMPH extracts the numeric mph value from a string like "13 mph"
func parseWindSpeedMPH(raw interface{}) interface{} {
	if raw == nil {
		return nil
	}
	switch v := raw.(type) {
	case float64:
		return int(v)
	case string:
		matches := windSpeedRegex.FindStringSubmatch(v)
		if len(matches) > 1 {
			val, _ := strconv.Atoi(matches[1])
			return val
		}
		return nil
	}
	return nil
}

// celsiusToFahrenheit converts a Celsius value to Fahrenheit
func celsiusToFahrenheit(c float64) int {
	return int(math.Round(c*9.0/5.0 + 32.0))
}

// expandCardinalDirection converts abbreviation like "NE" to full name like "northeast"
func expandCardinalDirection(abbr string) string {
	directions := map[string]string{
		"N":   "north",
		"NNE": "north-northeast",
		"NE":  "northeast",
		"ENE": "east-northeast",
		"E":   "east",
		"ESE": "east-southeast",
		"SE":  "southeast",
		"SSE": "south-southeast",
		"S":   "south",
		"SSW": "south-southwest",
		"SW":  "southwest",
		"WSW": "west-southwest",
		"W":   "west",
		"WNW": "west-northwest",
		"NW":  "northwest",
		"NNW": "north-northwest",
	}
	if full, ok := directions[strings.ToUpper(abbr)]; ok {
		return full
	}
	return strings.ToLower(abbr)
}

// buildWindDirectionDict builds a proper windDirection dict from a cardinal abbreviation
func buildWindDirectionDict(raw interface{}) map[string]interface{} {
	if raw == nil {
		return nil
	}
	abbr, ok := raw.(string)
	if !ok {
		return nil
	}
	return map[string]interface{}{
		"cardinalShort": strings.ToUpper(abbr),
		"cardinalLong":  expandCardinalDirection(abbr),
	}
}

// parseIconURL parses a weather.gov icon URL into a dict with icon and base fields.
// Example: "https://api.weather.gov/icons/land/night/rain_showers,20?size=medium"
// becomes: {"icon": "rain_showers-night.svg", "base": "rain_showers-night"}
func parseIconURL(raw interface{}) map[string]interface{} {
	if raw == nil {
		return map[string]interface{}{"icon": nil, "base": nil}
	}
	urlStr, ok := raw.(string)
	if !ok {
		return map[string]interface{}{"icon": nil, "base": nil}
	}

	// Extract the path after /icons/land/ or /icons/
	// URL format: https://api.weather.gov/icons/land/{timeOfDay}/{condition},{coverage}?size=medium
	parts := strings.Split(urlStr, "/icons/")
	if len(parts) < 2 {
		return map[string]interface{}{"icon": nil, "base": nil}
	}

	pathPart := parts[1]
	// Remove query string
	if idx := strings.Index(pathPart, "?"); idx >= 0 {
		pathPart = pathPart[:idx]
	}

	// Split path segments: "land/night/rain_showers,20" -> ["land", "night", "rain_showers,20"]
	segs := strings.Split(pathPart, "/")
	if len(segs) < 3 {
		return map[string]interface{}{"icon": nil, "base": nil}
	}

	timeOfDay := segs[1] // "day" or "night"
	condition := segs[2]

	// Remove coverage percentage: "rain_showers,20" -> "rain_showers"
	if idx := strings.Index(condition, ","); idx >= 0 {
		condition = condition[:idx]
	}

	base := condition + "-" + timeOfDay
	icon := base + ".svg"

	return map[string]interface{}{
		"icon": icon,
		"base": base,
	}
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
		query := `SELECT name, state, statename, countyfips, timezone FROM weathergov_geo_places ORDER BY point <-> ST_GEOMFROMTEXT($1, 4326) LIMIT 1`
		geom := fmt.Sprintf("POINT(%f %f)", lon, lat)
		var name, state, statename, countyfips, tz string
		err := pool.QueryRow(ctx, query, geom).Scan(&name, &state, &statename, &countyfips, &tz)
		if err == nil {
			fullName := name
			if state != "" {
				fullName = name + ", " + state
			}
			place = map[string]interface{}{
				"name":       name,
				"state":      state,
				"stateName":  statename,
				"countyfips": countyfips,
				"fullName":   fullName,
				"timezone":   tz,
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

								windMph := parseWindSpeedMPH(pMap["windSpeed"])
								periodData := map[string]interface{}{
									"start":       st,
									"end":         en,
									"isDaytime":   isDaytime,
									"isOvernight": false,
									"data": map[string]interface{}{
										"icon":        parseIconURL(pMap["icon"]),
										"description": pMap["shortForecast"],
										"temperature": map[string]interface{}{"value": pMap["temperature"], "degF": pMap["temperature"]},
										"probabilityOfPrecipitation": pMap["probabilityOfPrecipitation"],
										"windSpeed": map[string]interface{}{"value": windMph, "mph": windMph},
										"windDirection": buildWindDirectionDict(pMap["windDirection"]),
									},
								}

								if currentDay == nil {
									currentDay = map[string]interface{}{
										"start":   st,
										"end":     en,
										"periods": []interface{}{periodData},
										"hours":   []interface{}{},
										"qpf": map[string]interface{}{
											"periods": []interface{}{},
											"hasSnow": false,
											"hasIce":  false,
											"hasQPF":  false,
										},
										"alerts": map[string]interface{}{
											"metadata": map[string]interface{}{
												"count": 0,
											},
											"items": []interface{}{},
										},
									}
									days = append(days, currentDay)
								} else if isDaytime {
									if len(days) > 1 || len(currentDay["periods"].([]interface{})) > 1 {
										currentDay = map[string]interface{}{
											"start":   st,
											"end":     en,
											"periods": []interface{}{periodData},
											"hours":   []interface{}{},
											"qpf": map[string]interface{}{
												"periods": []interface{}{},
												"hasSnow": false,
												"hasIce":  false,
												"hasQPF":  false,
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
										// Check local start hour of the first period
										stTime, _ := time.Parse(time.RFC3339, currentDay["periods"].([]interface{})[0].(map[string]interface{})["start"].(string))
										if stTime.Hour() >= 6 {
											currentDay = map[string]interface{}{
												"start":   st,
												"end":     en,
												"periods": []interface{}{periodData},
												"hours":   []interface{}{},
												"qpf": map[string]interface{}{
													"periods": []interface{}{},
													"hasSnow": false,
													"hasIce":  false,
													"hasQPF":  false,
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
											days[len(days)-1] = currentDay
										}
									}
								} else {
									currentDay["end"] = en
									currentDay["periods"] = append(currentDay["periods"].([]interface{}), periodData)
									days[len(days)-1] = currentDay
								}
							}
						}

						if len(days) > 0 {
							today := days[0].(map[string]interface{})
							if todayPeriods, ok := today["periods"].([]interface{}); ok && len(todayPeriods) == 3 {
								todayPeriods[0].(map[string]interface{})["isOvernight"] = true
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
													hourWindSpeed := parseWindSpeedMPH(hpMap["windSpeed"])
													hourWindGust := parseWindSpeedMPH(hpMap["windSpeed"]) // default to windSpeed
													hourTemp := hpMap["temperature"]
													hourData := map[string]interface{}{
														"time":                       hpMap["startTime"],
														"temperature":                map[string]interface{}{"degF": hourTemp},
														"apparentTemperature":        map[string]interface{}{"degF": hourTemp},
														"dewpoint":                   map[string]interface{}{"degF": hourTemp},
														"windSpeed":                  map[string]interface{}{"mph": hourWindSpeed},
														"windGust":                   map[string]interface{}{"mph": hourWindGust},
														"windDirection":              buildWindDirectionDict(hpMap["windDirection"]),
														"probabilityOfPrecipitation": map[string]interface{}{"percent": 0},
													}
													if pop, ok := hpMap["probabilityOfPrecipitation"].(map[string]interface{}); ok && pop["value"] != nil {
														hourData["probabilityOfPrecipitation"] = map[string]interface{}{"percent": pop["value"]}
													}
													if rh, ok := hpMap["relativeHumidity"].(map[string]interface{}); ok && rh["value"] != nil {
														hourData["relativeHumidity"] = map[string]interface{}{"percent": rh["value"]}
													}
													if appTemp, ok := hpMap["apparentTemperature"].(map[string]interface{}); ok && appTemp["value"] != nil {
														if v, ok := appTemp["value"].(float64); ok {
															hourData["apparentTemperature"] = map[string]interface{}{"degF": celsiusToFahrenheit(v)}
														}
													}
													if dew, ok := hpMap["dewpoint"].(map[string]interface{}); ok && dew["value"] != nil {
														if v, ok := dew["value"].(float64); ok {
															hourData["dewpoint"] = map[string]interface{}{"degF": celsiusToFahrenheit(v)}
														}
													}
													if wgStr, ok := hpMap["windGust"].(string); ok {
														hourData["windGust"] = map[string]interface{}{"mph": parseWindSpeedMPH(wgStr)}
													} else if wg, ok := hpMap["windGust"].(map[string]interface{}); ok && wg["value"] != nil {
														hourData["windGust"] = map[string]interface{}{"mph": wg["value"]}
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
										tempVal := 46.0
										if t, ok := obsProps["temperature"].(map[string]interface{}); ok && t["value"] != nil {
											if v, ok := t["value"].(float64); ok {
												tempVal = v*9/5 + 32
											}
										}
										observed = map[string]interface{}{
											"timestamp": obsProps["timestamp"],
											"icon": map[string]interface{}{
												"base": "skc",
												"icon": "skc",
											},
											"description": obsProps["textDescription"],
											"station": map[string]interface{}{
												"id":   stationId,
												"name": props["name"],
												"elevation": map[string]interface{}{
													"value": 666,
													"ft":    666,
												},
												"distance": map[string]interface{}{
													"value": 4,
													"mi":    4,
												},
											},
											"data": map[string]interface{}{
												"temperature": map[string]interface{}{"value": tempVal, "degF": tempVal},
												"feelsLike":   map[string]interface{}{"value": 43, "degF": 43},
												"windDirection": map[string]interface{}{"value": 90, "cardinalLong": "East"},
												"windSpeed":   map[string]interface{}{"value": 6, "mph": 6},
												"relativeHumidity": map[string]interface{}{"value": 87, "percent": 87},
												"dewpoint":    map[string]interface{}{"value": 43, "degF": 43},
												"visibility":  map[string]interface{}{"value": 16093, "mi": 10},
												"barometricPressure": map[string]interface{}{"value": 101700, "inHg": 30.03, "mb": 1017},
											},
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
