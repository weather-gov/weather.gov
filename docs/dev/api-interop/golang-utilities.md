# Golang Utilities & Architecture

The API Interop Layer's core logic has been ported to Golang to achieve high concurrency and low latency. This document outlines the key utilities and architectural patterns used in the new implementation.

## Core Data Utilities

The `pkg/weather/data` package contains the business logic for fetching and normalizing weather data.

### `GetPointData`
**Path:** `pkg/weather/data/points.go`

Aggregates data for a specific latitude/longitude.
- **Concurrent Fetching**: Uses goroutines to fetch Grid, Forecast, Alerts, Observations, and Satellite data in parallel.
- **Fail-Safe**: Partial failures (e.g., satellite unavailable) do not block the main response.
- **Radar Integration**: Now includes `RadarMetadata` in the response.

### `GetCountyData`
**Path:** `pkg/weather/data/county.go`

Retrieves county-level information, including:
- **Geometry**: Simplified GeoJSON shape for the county.
- **Risk Overview**: Fetches GHWO data (now handles 404s gracefully).
- **Alerts**: Computes active alerts and "Alert Days" for the next 5 days.

### `GetRadarMetadata`
**Path:** `pkg/weather/data/radar.go`

Determines the appropriate radar station and coverage metadata for a location.
- **Caching**: Caches radar station capabilities to reduce database load.
- **Heuristics**: Selects the best radar based on distance/coverage.

## JSON Processing

We use standard `encoding/json` with streaming where possible to minimize memory overhead.

- **Streaming Response**: Handlers use `json.NewEncoder(w).Encode(resp)` to write directly to the HTTP response stream.
- **Zero-Copy Parsing**: Use `json.RawMessage` to pass through pre-formatted JSON from the database (e.g., Shapefiles) without re-marshaling.

## Testing & Benchmarks

The Golang codebase includes a robust testing suite.

- **Unit Tests**: Co-located with code (e.g., `county_test.go`).
- **Benchmarks**: Performance tests in `pkg/weather/data/benchmark_test.go` and `processing_bench_test.go`.

Run tests with:
```bash
go test ./...
go test -bench=. ./...
```
