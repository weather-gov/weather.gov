package server

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type Server struct {
	Router *chi.Mux
	DB     *sql.DB
}

func NewServer(db *sql.DB) *Server {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	srv := &Server{
		Router: r,
		DB:     db,
	}
	srv.routes()

	return srv
}

func (s *Server) routes() {
	s.Router.Get("/version", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("1.0.0"))
	})

	s.Router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		if err := s.DB.Ping(); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte("DB Error"))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Routes from handlers.go
	s.Router.Get("/alerts/active", s.handleAlertsActive)
	s.Router.Get("/meta/alerts", s.handleAlertsMeta)
	s.Router.Get("/alerts/active/count", s.handleAlertsCount)

	// Point Logic
	s.Router.Get("/point/{lat},{lon}", s.handlePoint)

	// Gridpoints
	s.Router.Get("/gridpoints/{wfo}/{x},{y}/forecast", s.handleForecast)
	s.Router.Get("/gridpoints/{wfo}/{x},{y}/forecast/hourly", s.handleForecastHourly)
	s.Router.Get("/gridpoints/{wfo}/{x},{y}/stations", s.handleStations)

	// Stations
	s.Router.Get("/stations/{stationId}/observations", s.handleObservations)

	// Radar
	s.Router.Get("/radar/profiler", s.handleRadarProfiler)

	// Products
	s.Router.Get("/products/{productId}", s.handleProduct)

	// Risk Overview
	s.Router.Get("/risk-overview/{placeId}", s.handleRiskOverview)
}

func (s *Server) Start() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	return http.ListenAndServe(":"+port, s.Router)
}
