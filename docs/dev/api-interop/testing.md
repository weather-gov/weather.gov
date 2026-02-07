# Testing & Performance

Ensuring the stability and performance of the API Interop Layer is critical. We use a combination of standard Go testing, performance benchmarks, and end-to-end simulations.

## Regression Testing

Regression tests cover unit logic, integration flows, and edge cases. They should be run before every commit.

### Running Unit Tests
To run all unit tests in the project:

```bash
go test ./...
```

To run tests for a specific package (e.g., data processing):

```bash
go test ./pkg/weather/data/...
```

### Checking Test Coverage
We aim for high test coverage on core business logic. To generate a coverage report:

```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## Performance Benchmarks

Performance tests measure the execution time of critical functions and data transformations.

### Running Go Benchmarks

Benchmarks are located within `pkg/weather` and other packages, suffixed with `_test.go` and function names starting with `Benchmark`.

To run all benchmarks:

```bash
go test -bench=. ./...
```

To run a specific benchmark (e.g., Forecast Processing):

```bash
go test -bench=BenchmarkForecastProcessing ./pkg/weather/data
```

### End-to-End Performance Comparison (Node.js vs Go)

We have a script to compare the latency of the legacy Node.js implementation against the new Golang implementation for the critical `/point` endpoint.

**Prerequisites:**
- Node.js environment
- Both servers running (or ability to run them)

**Command:**
```bash
node test/e2e_perf_comparison.js
```

This script sends concurrent requests to both implementations and reports P50, P95, and P99 latency.

### Page Load Simulation

To simulate a real-user scenario (fetching Grid, Forecast, Alerts, and Radar data in parallel), use the page load test script.

**Command:**
```bash
node test/page_load_test.js
```

This script:
1.  Simulates a browser client.
2.  Triggers all necessary API calls for a "Point Forecast" page load.
3.  Measures the total time until all data is received.
