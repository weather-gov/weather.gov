# Performance Benchmarks

The API Interop Layer includes a comprehensive performance benchmarking suite to ensure low-latency responses and efficient resource usage. As we migrate components from Node.js to Golang, we track performance metrics to validate improvements.

## Latest Comparison (Node.js vs Golang)

*Benchmarks run on Feb 7, 2026*

| Component | Node.js | Golang | Improvement |
| :--- | :--- | :--- | :--- |
| **Timezone Conversion** | 1.89 µs | 0.01 µs | **~170x** |
| **Forecast Processing** | 600 µs | 50 µs | **12x** |
| **HTTP Helper Overhead**| 247 µs | 82 µs | **3x** |

The transition to Golang has drastically reduced the CPU cost of date/time operations and heavy data transformation logic.

## Running Benchmarks

### Node.js
To run the existing Node.js benchmarks:

```bash
cd api-interop-layer
npm run test:perf
```

### Golang
To run the Golang benchmarks:

```bash
cd api-interop-layer
npm run test:perf:go
# OR directly via go tool
go test -bench=. ./pkg/weather/...
```

## Continuous Integration

Performance tests are designed to be distinct from unit tests. They are not run by default `npm test` to save time, but should be run:
1. Before merging major refactors.
2. When changing data processing logic (e.g. `ForecastDaily`).
3. When updating core utilities (`convert`, `timezone`).

## Benchmark Architecture

- **Micro-benchmarks**: Test individual utility functions (`SentenceCase`, `ConvertProperties`) in isolation.
- **Processing benchmarks**: Test the heavy "business logic" transformation of raw API responses into frontend-ready JSON.
- **Integration benchmarks**: (Go only) Test the full request lifecycle with mocked upstream NWS APIs to measure router and handler overhead.

## Detailed Results
> Last Updated: 2026-02-07

The following benchmarks compare the performance of critical utility functions in the TypeScript implementation versus the experimental Golang implementation.

| Function | TS Mean (ns) | TS Ops/Sec | Go Mean (ns) | Go Ops/Sec |
| :--- | :--- | :--- | :--- | :--- |
| `AFDParser` | - | - | 15,406 | 64,910 |
| `ConvertProperties` | 1,411 | 708,597 | 1,388 | 720,461 |
| `ConvertTimezone` | 1,888 | 529,623 | 11 | 90,497,738 |
| `FetchAPIJson` | 247,364 | 4,043 | 81,748 | 12,233 |
| `ForecastProcessing` | 598,528 | 1,671 | 50,353 | 19,860 |
| `Integration_Alerts` | - | - | 74,845 | 13,361 |
| `Integration_Forecast` | - | - | 250,891 | 3,986 |
| `ParagraphSquash` | 281 | 3,564,977 | 117 | 8,547,009 |
| `PostProcessAlerts` | - | - | 649,629 | 1,539 |
| `RiskProcessing` | 11,812 | 84,657 | 21,220 | 47,125 |
| `SentenceCase` | 303 | 3,296,341 | 294 | 3,401,361 |
| `TitleCase` | - | - | 654 | 1,528,585 |

## End-to-End Performance Analysis

We analyzed the end-to-end performance of the Forecast request lifecycle.

| Metric | Node.js (Est.) | Golang (Measured) | Improvement |
| :--- | :--- | :--- | :--- |
| **Forecast Processing** | ~0.60ms | ~0.05ms | **12x** |
| **Network Overhead** | ~0.60ms | ~0.10ms | **6x** |
| **Total Latency** | **>1.2ms** | **~0.25ms** | **>5x** |

**Conclusion:**
The Go implementation's `Integration_Forecast` latency of **~0.25ms** demonstrates a massive improvement over the Node.js architecture. The overhead of processing and Date/Time operations in Node.js makes it significantly slower for this high-traffic endpoint.


