# Golang Implementation Details

The API Interop Layer's core logic has been fully ported to Golang to achieve high concurrency, type safety, and low latency. This document outlines the architectural patterns, key packages, and data flow of the new implementation.

## Architecture

The application follows a standard Go HTTP service architecture:

- **Router:** [Chi](https://github.com/go-chi/chi) is used for lightweight, idiomatic routing.
- **Handlers:** Located in `cmd/server/handlers`, these functions map HTTP requests to business logic.
- **Business Logic:** The core logic resides in `pkg/weather`, separated by domain (e.g., `data`, `alerts`).
- **Data Access:** `internal` packages handle database connections (PostgreSQL) and external API calls.

### Directory Structure

```
api-interop-layer/
├── cmd/
│   └── server/          # Main entry point and HTTP handlers
├── pkg/
│   └── weather/
│       ├── data/        # Core data fetching and normalization (Point, Grid, Obs)
│       ├── alerts/      # Alert polling and processing logic
│       └── products/    # Text product parsing (AFD, etc.)
└── internal/
    ├── db/              # Database connection polling
    └── json/            # High-performance JSON utilities
```

## Core Data Flows

### 1. Point Data Aggregation (`GetPointData`)
**Path:** `pkg/weather/data/points.go`

This is the primary function powering the `/point/{lat}/{lon}` endpoint. It orchestrates the concurrent retrieval of all necessary weather data for a location.

- **Parallel Fetching:** We use `sync.WaitGroup` and goroutines to fetch independent data sources simultaneously:
    - **Grid Data:** NWS Grid forecast (via official API).
    - **Point Forecast:** Daily/Hourly forecast products.
    - **Alerts:** Active alerts for the location (from local cache).
    - **Observations:** Current conditions (nearest station).
    - **Satellite/Radar:** Metadata for the nearest radar station.
- **Fail-Safe Design:** Partial failures (e.g., Satellite API down) are logged but do not crash the entire request. The response returns partial data where possible.

### 2. County Data & Risk (`GetCountyData`)
**Path:** `pkg/weather/data/county.go`

Retrieves context-aware data for the user's county.

- **Geometry:** Returns simplified GeoJSON for the county boundary.
- **Risk Overview:** Fetches Global Hazards and Weather Overview (GHWO) data.
    - *Improvement:* Now handles 404s from upstream sources gracefully, returning an empty risk object instead of an error.
- **Alert Days:** Computes "Alert Days" for the next 5 days based on active alerts and risk outlooks.

### 3. Radar Selection (`GetRadarMetadata`)
**Path:** `pkg/weather/data/radar.go`

Determines the appropriate radar station and coverage metadata.

- **Heuristics:** select the best radar based on distance and known coverage maps.
- **Caching:** Caches radar station capabilities to minimize database lookups.

## Key Utilities

### JSON Processing
Weather data payloads can be large (hundreds of KB). To minimize memory changes and GC pressure:

- **Streaming Response:** Handlers use `json.NewEncoder(w).Encode(resp)` to write directly to the HTTP response stream.
- **Zero-Copy Forwarding:** We use `json.RawMessage` to pass through pre-formatted JSON from the database (e.g., complex Geometry shapes) without unmarshaling and re-marshaling them.

### Alert Caching System
The system maintains a local cache of all active NWS alerts to provide sub-millisecond lookup times.

- **Poller:** A background goroutine (`pkg/weather/alerts/poller.go`) fetches the full alert stream from NWS every 30 seconds.
- **Spatial Index:** Alerts are indexed by geometry (PostGIS) to allow for fast "point-in-polygon" queries when a user requests a forecast for a specific coordinate.

## Interop Role

The "Interop" layer serves as the translation and optimization middleware between the backend data sources and the frontend.

| Responsibility | Implementation |
| :--- | :--- |
| **Protocol Translation** | Converts upstream XML/CAP/GeoJSON into client-optimized JSON. |
| **Unit Conversion** | Standardizes all units (e.g., knots to mph) before sending to client. |
| **Error Handling** | Masks upstream 500s/timeouts, providing fallback data or friendly error messages. |
| **Concurrency Management**| Multiplexes a single client request into multiple upstream requests. |
