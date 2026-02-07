package server

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	_ "weathergov/api-interop/docs"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger/v2"
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
	// Swagger
	s.Router.Get("/swagger/*", httpSwagger.WrapHandler)

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

	// Meta
	s.Router.Get("/meta/alerts", s.handleAlertsMeta)

	// Point
	s.Router.Get("/point/{lat}/{lon}", s.handlePoint)

	// Gridpoints
	s.Router.Get("/gridpoints/{wfo}/{x}/{y}/forecast", s.handleForecast)

	// Products
	s.Router.Get("/products/{productId}", s.handleProduct)

	// Risk Overview
	s.Router.Get("/risk-overview/{placeId}", s.handleRiskOverview)

	// County
	s.Router.Get("/county/{fips}", s.handleCounty)

	// Radar
	s.Router.Get("/radar/{lat}/{lon}", s.handleRadar)
}

func (s *Server) Start() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	return http.ListenAndServe(":"+port, s.Router)
}
