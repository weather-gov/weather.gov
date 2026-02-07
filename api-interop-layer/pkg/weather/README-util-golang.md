# Util Golang

This directory contains GoLang ports of the utilities found in the parent `util` directory.
The goal is to provide high-performance, statically typed alternatives to the existing JavaScript utilities, suitable for compilation to WebAssembly (WASM) or native executables.

## Ported Utilities

The following utilities have been ported to Go:

### Case (`case.go`)
- `SentenceCase(str string) string`: Converts a string to sentence case.
- `TitleCase(str string) string`: Converts a string to title case, matching the logic of the original JS utility.

### Convert (`convert.go`)
- `ConvertValue(obj map[string]interface{}) map[string]interface{}`: Converts a single value object based on its `unitCode` or `uom`.
- `ConvertProperties(obj map[string]interface{}) map[string]interface{}`: Recursively searches for and converts properties with unit codes.
- **Supported Units**:
  - `degC` <-> `degF`
  - `km/h` <-> `mph`
  - `mm` <-> `in`
  - `m` <-> `ft`, `mi`
  - `Pa` -> `mb`, `inHg`
  - `degree_(angle)` -> Cardinal directions (N, NE, etc.)

### Icon (`icon.go`)
- `ParseAPIIcon(apiIcon string) IconResult`: Parses a NWS API icon URL and maps it to a legacy icon set using the embedded `icon.legacyMapping.json`.

### Fetch (`fetch.go`)
- `FetchAPIJson(path string) (interface{}, error)`: Fetches JSON content from a URL with built-in resilience and caching.
  - **Retries**: Implements exponential backoff for 5xx server errors (75ms, 124ms, 204ms, 337ms).
  - **Caching**: Integrates with Redis to cache responses if `s-maxage` is present in the `Cache-Control` header.
  - **Env Vars**:
    - `API_URL`: Base URL for API requests (default: `https://api.weather.gov`)
    - `GHWO_URL`: Base URL for GHWO requests (default: `https://www.weather.gov`)
    - `API_KEY`: API Key header.
    - `API_INTEROP_PRODUCTION`: Enables production Redis config (VCAP_SERVICES).
    - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Config for local/dev Redis.

### Redis (`redis.go`)
- Provides a wrapper around `go-redis` to handle connection initialization and VCAP_SERVICES parsing for Cloud Foundry environments.
- Helper functions: `GetFromRedis`, `SaveToRedis`, `GetTTLFromResponse`.

### Timezone (`timezone.go`)
- `ConvertTimezone(t time.Time, timezone string) (time.Time, error)`: Converts a `time.Time` object to the specified IANA timezone (e.g., "America/New_York").
- **Caching**: Uses an internal `sync.Map` to cache `time.Location` objects, avoiding repeated disk I/O from `time.LoadLocation`.
- **Performance**: Extremely fast (~11.5ns/op), providing a >4000x speedup over the JavaScript `dayjs` equivalent.

## Testing

Tests are written in Go and cover the ported functionality.
- **Convert**: Comprehensive tests covering all unit mappings (Temperature, Speed, Pressure, Length, Angle) and property recursion.
- **Icon**: Tests covering standard, multi-condition, and invalid inputs.
- **Fetch**: Tests using `httptest` and `miniredis` to verify retry logic, delay timing, Redis caching, and error handling.
- **Case/Squash**: Tests covering text manipulation logic.
- **Timezone**: Verified against fixed points in time and standard IANA zones.

To run the tests:
```bash
go test -v .
```

## Migration Notes

- **Dependencies**:
  - `github.com/redis/go-redis/v9`: Redis client.
  - `github.com/alicebob/miniredis/v2`: For testing Redis interactions.
  - `icon.legacyMapping.json`: Embedded via `go:embed`.
