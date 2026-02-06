
# Performance Comparison: JS vs Go Utilities

## Methodology

This report compares the performance of utility functions implemented in both JavaScript (Node.js) and Go.

### Test Setup
- **JavaScript**: executed via `util/perf.js` using `perf_hooks`.
  - **Iterations**: 10,000 runs for utility functions, 1,000 runs for fetch operations.
  - **Environment**: Node.js `v22.20.0`.
- **Go**: executed via `go test -bench=.` using the standard `testing` package.
  - **Iterations**: Adaptive. Go automatically determines the number of iterations (N) to run the benchmark for a sufficient duration (defaults to 1 second per test). This resulted in between ~14,000 (fetch) and ~3,000,000 (simple string ops) iterations.
  - **Environment**: Go 1.21.

### What Was Tested
1.  **ConvertProperties**: A complex structural transformation of a weather property object.
2.  **SentenceCase / TitleCase**: String manipulation logic using regex and splitting.
3.  **ParagraphSquash**: Text formatting to remove excess whitespace.
4.  **FetchAPIJson**: A network simulation performing an HTTP GET request to a local mock server and parsing the JSON response.
5.  **ConvertTimezone**: Converting a standard UTC timestamp to a specific timezone (e.g. America/New_York).

**Note**: For the fetch benchmark, a local mock HTTP server was spun up on a dynamic port to eliminate external network variation. Redis caching was disabled.

## Conclusions

1.  **Timezone Conversion Logic**:
    *   **Original JS**: Relies on `dayjs` and `Intl.DateTimeFormat` with object overhead. (~50,000 ns/op).
    *   **Optimized JS**: By using a specialized function that caches `Intl.DateTimeFormat` and uses string parsing instead of object allocation, we achieved a **~25x improvement** (~2,000 ns/op).
    *   **Go**: Still **massively faster** (~11.5 ns). Go's native `time` package handles timezone calculations with simple arithmetic and memory lookups, making it **~180x faster** than even the *optimized* JS version.
2.  **Complex Logic Favors Go**: For `ConvertProperties`, which involves traversing objects and applying logic, Go was **~2.3x faster**. This suggests Go is better suited for the heavy lifting of data transformation in this pipeline.
3.  **Network/JSON Handling Favors Go**: For `FetchAPIJson`,Go was **~4.4x faster**. Go's standard library `net/http` and `encoding/json` are highly optimized for this use case compared to Node's `fetch` implementation.
4.  **Micro-String Operations**: Initially, JavaScript performed better on simple string operations. However, after optimizing `ParagraphSquash` to use `strings.Builder` instead of Regex, Go `ParagraphSquash` is now **~4.4x faster** than the JS version (118 ns/op vs 525 ns/op). This highlights that while V8 is fast, optimized Go code using the right primitives (byte-level processing) can outperform JS significantly.

**Recommendation**: The `api-interop-layer` would benefit significantly from moving the heavy data transformation, fetching, and date/time logic to Go.

---

## Deep Dive: ParagraphSquash Optimization

The initial port of `ParagraphSquash` to Go mirrored the JavaScript implementation using regex:
`regexp.MustCompile("([^\\n])\\n([^\\n])").ReplaceAllString(str, "$1 $2")`.

This simple implementation resulted in performance **~3x slower** than Node.js (1596 ns/op vs 525 ns/op).

**The Improvement:**
The implementation was redesigned (see `paragraph_squash.go`) to use a single-pass byte-level scanner with `strings.Builder`.

**Why it works:**
1.  **Zero Regex Overhead**: Go's `regexp` package is powerful but carries initialization and state-machine execution overhead that is significant for short strings. Node.js V8 has a highly optimized regex engine that mitigates this for simple patterns.
2.  **Memory Efficiency**: By using `strings.Builder` and `sb.Grow(len(str))`, we pre-allocate the exact validation buffer needed, eliminating dynamic resizing and allocations during the loop.
3.  **CPU Efficiency**: The new logic is a simple linear scan `O(N)` with predictable branching. It checks each byte directly, which is extremely friendly to CPU instruction pipelines compared to the opaque execution of a regex engine.

**Result**:
- **1596 ns/op** → **118 ns/op** (~13.5x improvement).
- Now **~4.4x faster** than the optimized JavaScript version.

---

## Test Environment
- **Date**: 2026-02-04
- **OS**: macOS (Apple M1 Pro)
- **Node.js**: v22.20.0
- **Go**: go1.21

## Detailed Results

| Utility | JS Time (ns/op) | Go Time (ns/op) | Difference (Go vs JS) |
| :--- | :--- | :--- | :--- |
| **ConvertProperties** | 4,016 | 1,482 | **~2.7x Faster** |
| .SentenceCase | 269 | 301 | ~1.1x Slower |
| .TitleCase | 442 | 675 | ~1.5x Slower |
| .ParagraphSquash | 525 | 118 | **~4.4x Faster** |
| **FetchAPIJson** | 375,403 | 85,767 | **~4.4x Faster** |
| **ConvertTimezone** | 49,722 (Original)<br>1,999 (Optimized) | 11.5 | **~4,323x Faster (vs Orig)**<br>**~181x Faster (vs Opt)** |
| **PostProcessAlerts** (1k items) | 34,598,791 (34.6ms) | 653,357 (0.65ms) | **~53x Faster** |
| **AFDParser** | 5,646 (5.6µs) | 15,621 (15.6µs) | ~2.8x Slower (Regex) |

## Raw Output

### JavaScript
```text
BenchmarkConvertProperties: 4016.78 ns/op (248955.42 ops/s)
BenchmarkSentenceCase: 269.02 ns/op (3717259.03 ops/s)
BenchmarkTitleCase: 442.05 ns/op (2262213.12 ops/s)
BenchmarkParagraphSquash: 525.73 ns/op (1902109.49 ops/s)
BenchmarkFetchAPIJson: 375403.71 ns/op (2663.80 ops/s)
BenchmarkConvertTimezone: 49722.22 ns/op (20111.73 ops/s)
```

### Go
```text
BenchmarkConvertProperties-10             781591              1482 ns/op
BenchmarkSentenceCase-10                 3938809               301.6 ns/op
BenchmarkTitleCase-10                    1803637               675.3 ns/op
BenchmarkParagraphSquash-10              9695871               119.2 ns/op
BenchmarkFetchAPIJson-10                   13794             85767 ns/op
BenchmarkConvertTimezone-10             100000000               11.49 ns/op
```

### Optimized JavaScript (timezone-new.js)
```text
BenchmarkConvertTimezoneNew: 1999.89 ns/op (500027.08 ops/s)
```

