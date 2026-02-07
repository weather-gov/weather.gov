# API Interop Layer (Golang)

This directory contains the source code for the Weather.gov API Interop Layer, now powered by Golang.

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

### Testing

**Unit Tests:**
```bash
go test ./...
```

**Performance Tests:**
```bash
# Run end-to-end comparison (requires Node.js environment)
node test/e2e_perf_comparison.js
```

## deployment

CloudFoundry manifest is provided in `manifest.yml`.
```bash
cf push
```
