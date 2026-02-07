# API Interop Layer (Golang)

This directory contains the source code for the Weather.gov API Interop Layer, now powered by Golang. This layer is responsible for high-performance data processing, caching, and serving API requests.

## Project Structure

- `cmd/server`: Entry point for the HTTP server.
- `pkg/weather`: Core logic for weather data processing.
- `pkg/weather/data`: Data structures and parsing logic for forecasts, observations, alerts, and products (AFD).
- `internal`: Internal utilities and middleware.

## Getting Started

### Prerequisites
- Go 1.23+
- PostgreSQL (optional, for caching features)

### Running Locally

```bash
go run cmd/server/main.go
```

The server will start on port `8082` by default.

### API Documentation

Swagger UI is available at:
http://localhost:8082/swagger/index.html

## Testing

### Unit Tests
Run all unit tests with:
```bash
go test ./...
```

To see code coverage:
```bash
go test -cover ./pkg/weather/...
```

### Performance Tests
Performance benchmarks are included in the Go test suite:
```bash
go test -bench=. ./pkg/weather/...
```

End-to-end comparison with the legacy Node.js implementation (requires Node.js environment):
```bash
node test/e2e_perf_comparison.js
```

## Deployment

CloudFoundry manifest is provided in `manifest.yml`.
```bash
cf push
```
