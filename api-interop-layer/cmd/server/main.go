package main

import (
	"log"
	"log/slog"
	"os"
	"weathergov/api-interop/internal/server"
	"weathergov/api-interop/pkg/weather/data"
)

// @title Weather.gov API Interop Layer
// @version 1.0.0
// @description API documentation for the weather.gov interoperability layer
// @host localhost:8082
// @BasePath /
func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	db, err := data.GetDBConnection()
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer data.Cleanup()

	srv := server.NewServer(db)

	logger.Info("Starting server on :8082")
	if err := srv.Start(); err != nil {
		logger.Error("Server failed to start", "error", err)
		os.Exit(1)
	}
}
