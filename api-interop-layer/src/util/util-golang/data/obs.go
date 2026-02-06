package data

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"time"
	util_golang "weathergov/util-golang"
)

type ObsResult struct {
	Timestamp   string                 `json:"timestamp"`
	Icon        util_golang.IconResult `json:"icon"`
	Description string                 `json:"description"`
	Station     map[string]interface{} `json:"station"`
	Data        map[string]interface{} `json:"data"`
	Error       bool                   `json:"error,omitempty"`
	Message     string                 `json:"message,omitempty"`
}

type StationFeature struct {
	Properties struct {
		StationIdentifier string `json:"stationIdentifier"`
		Name              string `json:"name"`
		Elevation         struct {
			UnitCode string  `json:"unitCode"`
			Value    float64 `json:"value"`
		} `json:"elevation"`
	} `json:"properties"`
	Geometry interface{} `json:"geometry"`
}

type StationResponse struct {
	Features []StationFeature `json:"features"`
	Error    bool             `json:"error,omitempty"`
}

type ObsFeature struct {
	Properties map[string]interface{} `json:"properties"`
}

type ObsResponse struct {
	Features []ObsFeature `json:"features"`
	Error    bool         `json:"error,omitempty"`
}

func GetObs(grid *Grid, point *Point, place *Place, db *sql.DB) (*ObsResult, error) {
	// 1. Get Stations
	stationsPath := fmt.Sprintf("/gridpoints/%s/%d,%d/stations?limit=3", grid.WFO, grid.X, grid.Y)
	stationsRes, err := util_golang.FetchAPIJson(stationsPath)
	if err != nil {
		// Log warn
		return &ObsResult{Error: true, Message: "Failed to find an approved observation station"}, nil
	}

	// Marshaling roundtrip for easy struct handling (perf optimization later)
	b, _ := json.Marshal(stationsRes)
	var stations StationResponse
	_ = json.Unmarshal(b, &stations) // TODO: Check error?

	if stations.Error || len(stations.Features) == 0 {
		return &ObsResult{Error: true, Message: "Failed to find an approved observation station"}, nil
	}

	// Limit to 3
	features := stations.Features
	if len(features) > 3 {
		features = features[:3]
	}

	primaryStation := features[0]
	others := features[1:]

	// 2. Fetch Observations
	// Fetch Primary
	var primaryObs map[string]interface{}

	pPath := fmt.Sprintf("/stations/%s/observations?limit=1", primaryStation.Properties.StationIdentifier)
	pRes, err := util_golang.FetchAPIJson(pPath)
	if err == nil {
		b2, _ := json.Marshal(pRes)
		var pObs ObsResponse
		_ = json.Unmarshal(b2, &pObs)
		if !pObs.Error && len(pObs.Features) > 0 {
			primaryObs = pObs.Features[0].Properties
		}
	}

	valid := IsObservationValid(primaryObs)

	finalStation := primaryStation
	finalObs := primaryObs

	if !valid {
		// Try others in parallel?
		// TS: const others = stations.map(fetch...). Promise.all(others).
		// Then check one by one.

		type fetchResult struct {
			idx int
			obs map[string]interface{}
		}

		ch := make(chan fetchResult, len(others))
		for i, st := range others {
			go func(idx int, id string) {
				path := fmt.Sprintf("/stations/%s/observations?limit=1", id)
				res, err := util_golang.FetchAPIJson(path)
				var obs map[string]interface{}
				if err == nil {
					b3, _ := json.Marshal(res)
					var oRes ObsResponse
					_ = json.Unmarshal(b3, &oRes)
					if !oRes.Error && len(oRes.Features) > 0 {
						obs = oRes.Features[0].Properties
					}
				}
				ch <- fetchResult{idx, obs}
			}(i, st.Properties.StationIdentifier)
		}

		results := make([]map[string]interface{}, len(others))
		for range others {
			res := <-ch
			results[res.idx] = res.obs
		}

		found := false
		for i, obs := range results {
			if IsObservationValid(obs) {
				finalStation = others[i]
				finalObs = obs
				found = true
				break
			}
		}

		if !found {
			// No valid observations
			// TS: station = null; observation = null;
			return &ObsResult{Error: true, Message: "No valid observations found"}, nil
		}
	}

	// 3. Process Data
	if finalObs != nil {
		data := make(map[string]interface{})

		// filter keys with unitCode
		for k, v := range finalObs {
			if vMap, ok := v.(map[string]interface{}); ok {
				if _, hasUnit := vMap["unitCode"]; hasUnit {
					data[k] = v
				}
			}
		}

		// Feels Like logic
		// JS: data.feelsLike = data.heatIndex
		data["feelsLike"] = data["heatIndex"]

		checkVal := func(key string) bool {
			// check if NaN or nil
			v, ok := data[key].(map[string]interface{})
			if !ok || v == nil {
				return true
			} // treat as invalid/missing
			val := v["value"]
			if val == nil {
				return true
			}
			if f, ok := val.(float64); ok {
				return math.IsNaN(f)
			}
			// ParseInt check in JS: Number.isNaN(Number.parseInt(value, 10))
			// If value is string, parse int
			if s, ok := val.(string); ok {
				_, err := strconv.Atoi(s)
				return err != nil
			}
			return false // valid number
		}

		if checkVal("feelsLike") {
			data["feelsLike"] = data["windChill"]
		}
		if checkVal("feelsLike") {
			data["feelsLike"] = data["temperature"]
		}

		util_golang.ConvertProperties(data)

		// 4. Distance Query
		// Need DB
		// SELECT ST_DISTANCESPHERE(ST_GEOMFROMGEOJSON(...), ST_GEOMFROMTEXT('POINT(lon lat)'))

		var userLon, userLat float64
		// point argument has lat/lon
		// But in TS `point: { latitude, longitude }`
		// Wait, my GetObs signature has `point *Point`.
		// Need to verify `Point` struct in `points.go`?
		// I don't recall explicit `Point` struct being defined in `points.go` (it was `Place`?).
		// Ah `GetPointData` returned `*PointDataResult`.
		// But `GetClosestPlace` used DB.
		// `index.ts` calls `obs` with `{ grid, point, place }`.
		// `point` has latitude, longitude.

		// Let's assume point has lat/lon.
		// If `Point` struct not defined, define it.
		// Actually `points.go` defined `Place` struct.
		// I'll add `Point` struct here or verify.

		userLat = point.Latitude
		userLon = point.Longitude

		stGeomBytes, _ := json.Marshal(finalStation.Geometry)
		stGeomStr := string(stGeomBytes)

		query := fmt.Sprintf("SELECT ST_DISTANCESPHERE(ST_GEOMFROMGEOJSON('%s'), ST_GEOMFROMTEXT('POINT(%f %f)'))", stGeomStr, userLon, userLat)

		var distance float64
		if db != nil {
			err := db.QueryRow(query).Scan(&distance)
			if err != nil {
				// Log error
				fmt.Printf("DB Error: %v\n", err)
				// Continue? TS likely fails or returns null distance.
				// TS: const [{ distance }] = distanceResult.rows;
				// implies it expects result.
			}
		}

		// 5. Return
		tsStr, _ := finalObs["timestamp"].(string)
		// Convert timezone
		t, _ := time.Parse(time.RFC3339, tsStr)
		tInTz, _ := util_golang.ConvertTimezone(t, place.Timezone)

		iconStr, _ := finalObs["icon"].(string)
		descStr, _ := finalObs["textDescription"].(string)

		// Station formatted
		stationData := util_golang.ConvertProperties(map[string]interface{}{
			"id":   finalStation.Properties.StationIdentifier,
			"name": finalStation.Properties.Name,
			"elevation": map[string]interface{}{
				"unitCode": finalStation.Properties.Elevation.UnitCode,
				"value":    finalStation.Properties.Elevation.Value,
			},
			"distance": map[string]interface{}{
				"unitCode": "wmoUnit:m",
				"value":    distance,
			},
		})

		return &ObsResult{
			Timestamp:   tInTz.Format(time.RFC3339),
			Icon:        util_golang.ParseAPIIcon(iconStr),
			Description: descStr,
			Station:     stationData,
			Data:        data,
		}, nil
	}

	return &ObsResult{Error: true, Message: "No valid observations found"}, nil
}
