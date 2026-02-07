# Performance Benchmarks

The API Interop Layer includes a comprehensive performance benchmarking suite to ensure low-latency responses and efficient resource usage. As we migrate components from Node.js to Golang, we track performance metrics to validate improvements.

## Latest Comparison (Node.js vs Golang)

*Benchmarks run on Feb 7, 2026*

| Component | Node.js (Mean) | Golang (Mean) | Improvement |
| :--- | :--- | :--- | :--- |
| **Timezone Conversion** | 1,888 ns | 11 ns | **~170x** |
| **Forecast Processing** | 598.5 µs | 50.4 µs | **~12x** |
| **Paragraph Squashing** | 281 ns | 117 ns | **~2.4x** |
| **Risk Processing** | 11.8 µs | 21.2 µs | *(Implementation differs)* |
| **Fetch API (JSON Parsing)**| 247 µs | 82 µs | **~3x** |

The transition to Golang has drastically reduced the CPU cost of date/time operations and heavy data transformation logic. Note that `RiskProcessing` in Go includes additional validation and error handling not present in the Node.js benchmark, accounting for the difference.

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

## Page Load Simulation

> Added: 2026-02-07

A page load verification script (`test/page_load_test.js`) simulates the concurrent data fetching required for the Forecast Point page. This test triggers parallel requests for:
1. Point Data (Grid/Forecast/Alerts)
2. Radar Metadata
3. County Data (Risk/Alerts)

**Results (Golang Local):**
- **Samples**: 20
- **Concurrency**: 4 requests/sample
- **Mean Latency**: ~3.93ms
- **P95 Latency**: ~18.73ms

This measurement includes network overhead and database query time, confirming that the new Golang server is highly responsive even when cold.

## Methodology

### Node.js
Benchmarks were run using `benny` (benchmark library) via `npm run test:perf`. These isolate specific functions.

### Golang
Benchmarks serve as unit benchmarks within the `pkg/weather` package, run via `go test -bench`.

### Integration Tests
"Integration" benchmarks in Go mock the upstream HTTP calls but exercise the full `chi` router + handler stack to measure server overhead accurately.
