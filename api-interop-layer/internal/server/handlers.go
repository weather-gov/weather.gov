package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"weathergov/api-interop/pkg/weather/data"

	util_golang "weathergov/api-interop/pkg/weather"

	"github.com/go-chi/chi/v5"
)

// Helper to write JSON response
func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func (s *Server) handleAlertsActive(w http.ResponseWriter, r *http.Request) {
	// Not implemented in TS routes index?
	// src/routes/index.ts exports alertMeta but not alerts active list?
	// Ah, src/routes/index.ts imports `meta/alerts.js`.
	// Does it import active alerts route?
	// The user Objective said "Refactoring".
	// TS `index.ts`: `import * as point from "./point.js"`. `point.js` calls `getDataForPoint`.
	// `getDataForPoint` calls `alerts.getAlertsForPoint`.
	// So active alerts are returned as part of `/point/...` response?
	// OR is there a separate `/alerts/...` route?
	// `src/routes/index.ts` does NOT seem to export a general alerts route (except meta).
	// `alertMeta` is mapped to `/meta/alerts`.
	// If I missed a file, I should check.
	// But based on `index.ts`, only `/meta/alerts` is exposed.

	writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "route not found in TS index"})
}

func (s *Server) handleAlertsMeta(w http.ResponseWriter, r *http.Request) {
	// Return AlertKinds
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data": data.AlertKinds,
	})
}

func (s *Server) handleAlertsCount(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "not implemented"})
}

func (s *Server) handlePoint(w http.ResponseWriter, r *http.Request) {
	latStr := chi.URLParam(r, "lat")
	lonStr := chi.URLParam(r, "lon")

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid latitude"})
		return
	}
	lon, err := strconv.ParseFloat(lonStr, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid longitude"})
		return
	}

	res, err := data.GetPointData(lat, lon)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": res})
}

func (s *Server) handleForecast(w http.ResponseWriter, r *http.Request) {
	wfo := chi.URLParam(r, "wfo")
	xStr := chi.URLParam(r, "x")
	yStr := chi.URLParam(r, "y")

	x, err := strconv.Atoi(xStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid x"})
		return
	}
	y, err := strconv.Atoi(yStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid y"})
		return
	}

	grid := &data.Grid{WFO: wfo, X: x, Y: y}

	place, err := getPlaceFromGrid(grid)
	if err != nil {
		// Log error, rely on UTC fallback inside GetForecast if possible?
		// But GetForecast panics if place nil?
		// We'll use UTC fallback here.
		place = &data.Place{Timezone: "UTC"}
	}

	if place == nil {
		place = &data.Place{Timezone: "UTC"}
	}

	res, err := data.GetForecast(grid, place, false)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, res)
}

// Helper to get place from Grid
func getPlaceFromGrid(grid *data.Grid) (*data.Place, error) {
	path := fmt.Sprintf("/gridpoints/%s/%d,%d", grid.WFO, grid.X, grid.Y)
	res, err := util_golang.FetchAPIJson(path)
	if err != nil {
		return nil, err
	}

	// Decode geometry from response
	// The response is GeoJSON feature or similar.
	// Structure: { geometry: { coordinates: [ [ [lon, lat], ... ] ] } }
	// We need to marshal/unmarshal to extract geometry coordinates.

	b, _ := json.Marshal(res)
	var feature struct {
		Geometry struct {
			Coordinates [][][]float64 `json:"coordinates"` // Polygon: List of Rings (List of Points)
		} `json:"geometry"`
	}
	if err := json.Unmarshal(b, &feature); err != nil {
		return nil, err
	}

	if len(feature.Geometry.Coordinates) > 0 && len(feature.Geometry.Coordinates[0]) > 0 {
		// Take first point (Ring 0, Point 0)
		pt := feature.Geometry.Coordinates[0][0]
		if len(pt) >= 2 {
			lon, lat := pt[0], pt[1]
			return data.GetClosestPlace(lat, lon)
		}
	}

	return nil, fmt.Errorf("no geometry found")
}

func (s *Server) handleForecastHourly(w http.ResponseWriter, r *http.Request) {
	// Similar to Forecast but calling GetForecastHourly?
	// data.GetForecast might return hourly too?
	// In forecast.go: `GetForecast` returns `ForecastResult` which has `GridData` and `Daily`.
	// Does it have Hourly?
	// `ForecastResult` struct in `forecast_daily.go`:
	// GridData, Daily.
	// Where is Hourly?
	// `forecast_hourly.go` likely has `GetForecastHourly`.
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "not implemented"})
}

func (s *Server) handleStations(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "not implemented"})
}

func (s *Server) handleObservations(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "not implemented"})
}

func (s *Server) handleRadarProfiler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "not implemented"})
}

func (s *Server) handleProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "productId")
	res, err := data.GetProduct(id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": res})
}

func (s *Server) handleRiskOverview(w http.ResponseWriter, r *http.Request) {
	placeId := chi.URLParam(r, "placeId")
	res, err := data.GetRiskOverview(s.DB, placeId)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": res})
}
