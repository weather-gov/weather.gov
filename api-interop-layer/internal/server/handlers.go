package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	util_golang "weathergov/api-interop/pkg/weather"
	"weathergov/api-interop/pkg/weather/data"

	"github.com/go-chi/chi/v5"
)

// Helper to write JSON response
func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

// handleAlertsMeta handles /meta/alerts
// @Summary Get alerts metadata
// @Description Get metadata about alert types
// @Tags Meta
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /meta/alerts [get]
func (s *Server) handleAlertsMeta(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data": data.AlertKinds,
	})
}

// handlePoint handles /point/{lat}/{lon}
// @Summary Get point data
// @Description Get weather data for a specific point including grid, place, alerts, forecast, obs, and radar metadata
// @Tags Point
// @Produce json
// @Param lat path number true "Latitude"
// @Param lon path number true "Longitude"
// @Success 200 {object} map[string]interface{}
// @Router /point/{lat}/{lon} [get]
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

	// Add Radar Metadata if we have a valid place
	if res.Place != nil {
		radarMeta, err := data.GetRadarMetadata(res.Place, lat, lon)
		if err == nil {
			res.RadarMetadata = radarMeta
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": res})
}

// handleForecast handles /gridpoints/{wfo}/{x}/{y}/forecast
// @Summary Get forecast
// @Description Get daily forecast for a grid point
// @Tags Forecast
// @Produce json
// @Param wfo path string true "WFO"
// @Param x path int true "Grid X"
// @Param y path int true "Grid Y"
// @Success 200 {object} data.ForecastResult
// @Router /gridpoints/{wfo}/{x}/{y}/forecast [get]
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
		// Use UTC fallback
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

// handleProduct handles /products/{productId}
// @Summary Get product
// @Description Get a specific text product by ID
// @Tags Products
// @Produce json
// @Param productId path string true "Product ID"
// @Success 200 {object} map[string]interface{}
// @Router /products/{productId} [get]
func (s *Server) handleProduct(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "productId")
	res, err := data.GetProduct(id)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": res})
}

// handleRiskOverview handles /risk-overview/{placeId}
// @Summary Get risk overview
// @Description Get risk overview for a place (FIPS or State)
// @Tags Risk
// @Produce json
// @Param placeId path string true "Place ID (FIPS or State Abbrev)"
// @Success 200 {object} map[string]interface{}
// @Router /risk-overview/{placeId} [get]
func (s *Server) handleRiskOverview(w http.ResponseWriter, r *http.Request) {
	placeId := chi.URLParam(r, "placeId")
	res, err := data.GetRiskOverview(s.DB, placeId)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if res == nil {
		writeJSON(w, http.StatusNotFound, map[string]interface{}{"error": "No risk overview found", "status": 404})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": res})
}

// handleCounty handles /county/{fips}
// @Summary Get county data
// @Description Get county details, risk overview, and alerts
// @Tags County
// @Produce json
// @Param fips path string true "County FIPS"
// @Success 200 {object} map[string]interface{}
// @Router /county/{fips} [get]
func (s *Server) handleCounty(w http.ResponseWriter, r *http.Request) {
	fips := chi.URLParam(r, "fips")
	res, err := data.GetCountyData(s.DB, fips)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	if res.Status >= 400 {
		writeJSON(w, res.Status, map[string]interface{}{
			"data":  map[string]interface{}{"error": res.Error},
			"error": res.Error,
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": res})
}

// handleRadar handles /radar/{lat}/{lon}
// @Summary Get radar metadata
// @Description Get radar metadata for a point
// @Tags Radar
// @Produce json
// @Param lat path number true "Latitude"
// @Param lon path number true "Longitude"
// @Success 200 {object} map[string]interface{}
// @Router /radar/{lat}/{lon} [get]
func (s *Server) handleRadar(w http.ResponseWriter, r *http.Request) {
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

	place, err := data.GetClosestPlace(lat, lon)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if place == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{"data": map[string]interface{}{"error": true}})
		return
	}

	radarMeta, err := data.GetRadarMetadata(place, lat, lon)
	if err != nil {
		radarMeta = &data.RadarMetadata{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"data": map[string]interface{}{
			"place": place,
			"point": map[string]float64{
				"latitude":  lat,
				"longitude": lon,
			},
			"radarMetadata": radarMeta,
		},
	})
}

// Helper to get place from Grid (Used by Forecast)
func getPlaceFromGrid(grid *data.Grid) (*data.Place, error) {
	path := fmt.Sprintf("/gridpoints/%s/%d,%d", grid.WFO, grid.X, grid.Y)
	res, err := util_golang.FetchAPIJson(path)
	if err != nil {
		return nil, err
	}

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
