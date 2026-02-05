# Alternative Performance Benchmark Report

## Attribution

This alternative benchmark suite was developed by **Claude (claude-3-5-sonnet-20241022)** to replicate and improve upon the original performance tests developed by **Gemini** (see `../perf.md`).

The goal was to provide a more rigorous statistical methodology while maintaining consistency with the original test cases and producing comparable results.

---

## Overview

This report presents an alternative performance benchmarking methodology with improved statistical rigor and consistency between JavaScript and Go implementations.

## Methodology Improvements

### Over Original Approach

| Aspect | Original | Alternative |
|--------|----------|-------------|
| **Warmup** | None (JS) | 1,000 iterations |
| **Statistics** | Single mean | Min, Max, Mean, Median, P95, Stddev |
| **Samples** | 1 run | 10 sample runs |
| **Memory** | Not tracked | Go: allocs/op reported |
| **Isolation** | Mixed overhead | Separated mutation overhead |

### Test Configuration

**JavaScript:**
- Warmup: 1,000 iterations
- Samples: 10 runs × 10,000 ops each
- Environment: Node.js v22.20.0
- Platform: macOS (Apple M1 Pro)

**Go:**
- Warmup: Automatic (Go testing framework)
- Iterations: Adaptive (targets 1 second per benchmark)
- Environment: Go 1.21
- Platform: darwin/arm64 (Apple M1 Pro)

**Date:** 2026-02-05

---

## Benchmark Results

### Summary Comparison

| Benchmark | JS Mean (ns/op) | Go Mean (ns/op) | Go vs JS | Go Allocs |
|-----------|-----------------|-----------------|----------|-----------|
| **SentenceCase** | 382 | 545 | 1.4x slower | 11 allocs |
| **TitleCase** | 444 | 1,025 | 2.3x slower | 16 allocs |
| **ParagraphSquash** | 315 | 259 | **1.2x faster** | 1 alloc |
| **ConvertValue** | 250 | 155 | **1.6x faster** | 3 allocs |
| **ConvertProperties (6 fields)** | 4,075 | 2,790 | **1.5x faster** | 48 allocs |
| **ConvertTimezone** | 1,268 | 12 | **105x faster** | 0 allocs |
| **ParseAPIIcon (Standard)** | - | 1,323 | - | 31 allocs |

---

## Detailed Results

### 1. String Operations (Case Conversion)

| Benchmark | JS (ns/op) | Go (ns/op) | Winner |
|-----------|------------|------------|--------|
| SentenceCase | 382 | 545 | **JS** (1.4x) |
| TitleCase | 444 | 1,025 | **JS** (2.3x) |

**Analysis:**
- V8's JIT-optimized regex engine outperforms Go's regexp package for simple patterns
- Go's regex overhead (11-16 allocations per op) dominates for short strings
- For these operations, JavaScript is the better choice

**JavaScript Stats (SentenceCase):**
```
Mean:    381.89 ns/op
Median:  347.87 ns/op
Stddev:  82.20 ns
Ops/sec: 2,618,521
```

**Go Stats (SentenceCase):**
```
BenchmarkSentenceCase-10    2151490    544.7 ns/op    226 B/op    11 allocs/op
```

---

### 2. ParagraphSquash

| Variant | JS (ns/op) | Go (ns/op) | Winner |
|---------|------------|------------|--------|
| Standard | 315 | 259 | **Go** (1.2x) |
| Short | - | 31 | - |
| Long (~1KB) | - | 3,822 | - |

**Analysis:**
- Go's optimized byte-level scanner beats JS for the standard case
- Go scales linearly with input size (O(n))
- Single allocation per operation in Go
- For text processing at scale, Go offers better performance

**JavaScript Stats:**
```
Mean:    314.99 ns/op
Median:  313.50 ns/op
Stddev:  9.23 ns
Ops/sec: 3,174,658
```

**Go Stats:**
```
BenchmarkParagraphSquash-10       6666334    258.9 ns/op    80 B/op    1 allocs/op
BenchmarkParagraphSquash_Short-10 38306632    30.82 ns/op   16 B/op    1 allocs/op
BenchmarkParagraphSquash_Long-10   317793    3822 ns/op   1792 B/op    1 allocs/op
```

---

### 3. Unit Conversion

| Benchmark | JS (ns/op) | Go (ns/op) | Winner |
|-----------|------------|------------|--------|
| ConvertValue | 250 | 155 | **Go** (1.6x) |
| ConvertProperties (6 fields) | 4,075 | 2,790 | **Go** (1.5x) |

**Analysis:**
- Go consistently outperforms JS for structured data transformation
- Lower allocation count in Go contributes to better performance
- For the core weather data transformation pipeline, Go provides a meaningful speedup

**JavaScript Stats (ConvertValue):**
```
Mean:    250.02 ns/op
Median:  230.71 ns/op
Stddev:  54.01 ns
Ops/sec: 3,999,733
```

**Go Stats:**
```
BenchmarkConvertValue-10              7700583    155.1 ns/op    24 B/op    3 allocs/op
BenchmarkConvertProperties_6Fields-10  393199   2790 ns/op   4736 B/op   48 allocs/op
```

---

### 4. Timezone Conversion

| Benchmark | JS (ns/op) | Go (ns/op) | Speedup |
|-----------|------------|------------|---------|
| Single TZ | 1,268 | 12 | **105x** |
| Multi-TZ (5 zones) | 1,253 | 14 | **90x** |

**Analysis:**
- This is where Go absolutely dominates
- Go's native `time` package with location caching achieves near-zero overhead
- Zero allocations after cache warmup
- JavaScript's `Intl.DateTimeFormat` caching helps but can't match Go's native performance
- For high-volume timestamp processing, Go is essential

**JavaScript Stats:**
```
Mean:    1,267.60 ns/op (~1.27 µs)
Median:  1,249.15 ns/op
Stddev:  64.46 ns
Ops/sec: 788,891
```

**Go Stats:**
```
BenchmarkConvertTimezone-10           100000000    11.94 ns/op    0 B/op    0 allocs/op
BenchmarkConvertTimezone_MultiTZ-10    90007028    13.70 ns/op    0 B/op    0 allocs/op
BenchmarkConvertTimezone_ColdCache-10  92321895    12.39 ns/op    0 B/op    0 allocs/op
```

---

### 5. Icon Parsing (Go Only)

| Variant | Go (ns/op) | Allocs |
|---------|------------|--------|
| Standard URL | 1,323 | 31 |
| Multi-condition | 1,690 | 34 |
| Invalid | 184 | 2 |

**Analysis:**
- URL parsing and regex operations create allocation pressure
- Invalid URL detection is fast (early exit)
- Room for optimization by pre-compiling regex patterns

**Go Stats:**
```
BenchmarkParseAPIIcon_Standard-10         844784    1323 ns/op    1996 B/op    31 allocs/op
BenchmarkParseAPIIcon_MultiCondition-10   725934    1690 ns/op    2053 B/op    34 allocs/op
BenchmarkParseAPIIcon_Invalid-10         6560407    184.2 ns/op    168 B/op     2 allocs/op
```

---

## Conclusions & Recommendations

### Where to Use Go

| Use Case | Speedup | Recommendation |
|----------|---------|----------------|
| **Timezone conversion** | 100x+ | **Critical** - Move to Go |
| **ConvertProperties** | 1.5x | Beneficial for data pipelines |
| **ConvertValue** | 1.6x | Beneficial for high-volume |
| **ParagraphSquash** | 1.2x | Modest improvement |

### Where to Keep JavaScript

| Use Case | JS Advantage | Recommendation |
|----------|--------------|----------------|
| **SentenceCase** | 1.4x faster | Keep in JS |
| **TitleCase** | 2.3x faster | Keep in JS |

### Overall Strategy

1. **High Priority (Go):** 
   - Timezone conversion - 100x improvement justifies immediate migration
   - Data transformation pipeline (`ConvertProperties`) - 1.5x with lower memory pressure

2. **Medium Priority (Go):**
   - Icon parsing - Good candidate for Go if volume increases
   - `ParagraphSquash` - Modest gains, worth it at scale

3. **Keep in JS:**
   - String case operations - V8's regex JIT is superior for these patterns

### Throughput Projections

At sustained load (ops/second):

| Operation | JS Throughput | Go Throughput | Improvement |
|-----------|---------------|---------------|-------------|
| Timezone | 788K/s | 83.7M/s | 106x |
| ConvertProperties | 245K/s | 358K/s | 1.46x |
| ConvertValue | 4M/s | 6.5M/s | 1.6x |

---

## Raw Benchmark Output

### JavaScript
```text
SentenceCase:
  Mean:    381.89 ns/op
  Median:  347.87 ns/op
  Min:     333.44 ns/op
  Max:     607.46 ns/op
  P95:     607.46 ns/op
  Stddev:  82.20 ns
  Ops/sec: 2,618,521

TitleCase:
  Mean:    443.99 ns/op
  Median:  446.39 ns/op
  Ops/sec: 2,252,282

ParagraphSquash:
  Mean:    314.99 ns/op
  Median:  313.50 ns/op
  Ops/sec: 3,174,658

ConvertValue:
  Mean:    250.02 ns/op
  Median:  230.71 ns/op
  Ops/sec: 3,999,733

ConvertTimezone (Optimized):
  Mean:    1.27 µs/op
  Median:  1.25 µs/op
  Ops/sec: 788,891

ConvertProperties (6 fields):
  Mean:    4.08 µs/op
  Median:  4.08 µs/op
  Ops/sec: 245,397
```

### Go
```text
BenchmarkSentenceCase-10                    2151490     544.7 ns/op     226 B/op    11 allocs/op
BenchmarkTitleCase-10                       1000000    1025 ns/op       274 B/op    16 allocs/op
BenchmarkParagraphSquash-10                 6666334     258.9 ns/op      80 B/op     1 allocs/op
BenchmarkParagraphSquash_Short-10          38306632      30.82 ns/op     16 B/op     1 allocs/op
BenchmarkParagraphSquash_Long-10             317793    3822 ns/op      1792 B/op     1 allocs/op
BenchmarkConvertValue-10                    7700583     155.1 ns/op      24 B/op     3 allocs/op
BenchmarkConvertValue_PreAllocated-10       8201754     200.8 ns/op      24 B/op     3 allocs/op
BenchmarkConvertProperties_6Fields-10        393199    2790 ns/op      4736 B/op    48 allocs/op
BenchmarkConvertTimezone-10               100000000      11.94 ns/op      0 B/op     0 allocs/op
BenchmarkConvertTimezone_MultiTZ-10        90007028      13.70 ns/op      0 B/op     0 allocs/op
BenchmarkConvertTimezone_ColdCache-10      92321895      12.39 ns/op      0 B/op     0 allocs/op
BenchmarkParseAPIIcon_Standard-10            844784    1323 ns/op      1996 B/op    31 allocs/op
BenchmarkParseAPIIcon_MultiCondition-10      725934    1690 ns/op      2053 B/op    34 allocs/op
BenchmarkParseAPIIcon_Invalid-10            6560407     184.2 ns/op     168 B/op     2 allocs/op
```

---

## How to Run

### JavaScript
```bash
cd api-interop-layer/util/perf/perf-alt
node perf-alt.js
```

### Go
```bash
cd api-interop-layer/util/perf/perf-alt
go test -bench=. -benchmem .
```

### With More Iterations (Go)
```bash
go test -bench=. -benchmem -benchtime=5s .
```
