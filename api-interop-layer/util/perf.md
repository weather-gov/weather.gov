
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

**Note**: For the fetch benchmark, a local mock HTTP server was spun up on a dynamic port to eliminate external network variation. Redis caching was disabled.

## Conclusions

1.  **Complex Logic Favors Go**: For `ConvertProperties`, which involves traversing objects and applying logic, Go was **~2.3x faster**. This suggests Go is better suited for the heavy lifting of data transformation in this pipeline.
2.  **Network/JSON Handling Favors Go**: The most significant difference was in `FetchAPIJson`, where Go was **~3x faster**. Go's standard library `net/http` and `encoding/json` are highly optimized for this use case compared to Node's `fetch` implementation.
3.  **Micro-String Operations**: Initially, JavaScript performed better on simple string operations. However, after optimizing `ParagraphSquash` to use `strings.Builder` instead of Regex, Go `ParagraphSquash` is now **~4.4x faster** than the JS version (118 ns/op vs 525 ns/op). This highlights that while V8 is fast, optimized Go code using the right primitives (byte-level processing) can outperform JS significantly.

**Recommendation**: The `api-interop-layer` would benefit significantly from moving the heavy data transformation and fetching logic to Go, as demonstrated by the `ConvertProperties` and `FetchAPIJson` results.

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
| **ConvertProperties** | 4,016 | 1,712 | **~2.3x Faster** |
| .SentenceCase | 269 | 363 | ~1.35x Slower |
| .TitleCase | 442 | 810 | ~1.8x Slower |
| .ParagraphSquash | 525 | 118 | **~4.4x Faster** |
| **FetchAPIJson** | 317,722 | 105,231 | **~3x Faster** |

## Raw Output

### JavaScript
```text
BenchmarkConvertProperties: 4016.78 ns/op (248955.42 ops/s)
BenchmarkSentenceCase: 269.02 ns/op (3717259.03 ops/s)
BenchmarkTitleCase: 442.05 ns/op (2262213.12 ops/s)
BenchmarkParagraphSquash: 525.73 ns/op (1902109.49 ops/s)
BenchmarkFetchAPIJson: 317722.00 ns/op (3147.41 ops/s)
```

### Go
```text
BenchmarkConvertProperties-10             773552              1712 ns/op
BenchmarkSentenceCase-10                 2985199               363.4 ns/op
BenchmarkTitleCase-10                    1506009               810.5 ns/op
BenchmarkParagraphSquash-10             10040128               118.3 ns/op
BenchmarkFetchAPIJson-10                   13645            105231 ns/op
```
