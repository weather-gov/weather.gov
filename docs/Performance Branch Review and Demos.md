# Performance Branch Review and Demos

## Overview

This branch (`experimental-perf`) implements two key performance optimizations for the forecast page:

1. **Lazy-Loading Architecture**: An asynchronous, partial-based loading pattern that delivers the initial page skeleton instantly while weather data loads in the background.
2. **Golang API Interop Layer**: A complete rewrite of the NodeJS API interop service in Go, implementing single-flight request coalescing, bounded goroutine orchestration, and native PostGIS spatial queries to eliminate the event-loop bottleneck.

## Architecture

### Lazy-Loading Pattern

The lazy-loading pattern relies on a custom vanilla JavaScript implementation (`wx-lazy-load`) combined with Django partial endpoints. The initial page request returns a skeleton layout instantly. A lightweight script on the client side (`point-lazy-load.js`) then fetches HTML snippets for each section (Header, Alerts, Today, Daily) asynchronously and injects them into the DOM.

**Pros:**

- Extremely fast initial layout render (TTFB/FCP), regardless of backend latency.
- No new third-party dependencies were introduced, keeping the payload lean.
- Degrades gracefully into empty sections if one specific API call fails, rather than crashing the entire page.
- Resolves security concerns regarding XSS by ensuring no injected scripts are dynamically executed during DOM swaps.

**Cons:**

- Requires custom, manual DOM management in `point-lazy-load.js` for component-specific side effects (such as un-hiding the alerts tab).
- We maintain our own implementation of a pattern that is solved robustly by established open-source libraries.

### Golang API Interop Layer

The Go interop (`api-interop-golang/`) replaces the NodeJS `api-interop-layer/` as the backend data aggregation service for point forecasts. Key design decisions:

- **Single-Flight Pattern** (`golang.org/x/sync/singleflight`): Concurrent requests for the same lat/lon are coalesced into a single upstream API call. This eliminates duplicate fetch storms under concurrent load.
- **Goroutine Orchestration**: Each point request fans out up to 6 parallel goroutines (place lookup, marine check, observations, forecast+hourly, alerts, weather story) and joins them via `sync.WaitGroup`, replacing Node's recursive `Promise.all` nesting.
- **Data Format Normalization**: The Go layer normalizes raw NWS API responses into the exact structure expected by Django templates. This includes:
  - Parsing wind speed strings (`"13 mph"` → integer `13`)
  - Converting temperatures from Celsius to Fahrenheit (for dewpoint, apparent temperature)
  - Expanding cardinal direction abbreviations (`"NE"` → `{"cardinalLong": "northeast", "cardinalShort": "NE"}`)
  - Parsing icon URLs into structured dicts (`{"icon": "rain_showers-night.svg", "base": "rain_showers-night"}`)
  - Querying full place metadata (name, state, countyfips) for proper display (e.g., "Vinings, GA")

### Future Evolution: HTMX

While the current custom JS approach works well, a future iteration of this architecture could migrate to use [htmx](https://htmx.org/) via `django-htmx`. This would replace the `wx-lazy-load` pattern with declarative HTML attributes (`hx-get`, `hx-trigger="load"`, `hx-swap`), eliminating the need for our custom `point-lazy-load.js` script.

## Recent Bug Fixes

### Go Interop Data Format Parity (April 2026)

The initial Go port returned raw NWS API data formats that did not match the normalized structure expected by Django template tags. This caused:

- **7-Day forecast crash (HTTP 500)**: The `wind_speed_direction` template tag tried to access `direction["cardinalLong"]` on a plain string, causing a `TypeError`.
- **Missing location state**: The place query only selected `name` and `timezone`, so location headers showed "Vinings" instead of "Vinings, GA".

These were fixed by adding five helper functions to `api-interop-golang/data/point.go`:

| Function | Purpose |
|----------|---------|
| `parseWindSpeedMPH()` | Extract numeric mph from strings like `"13 mph"` |
| `celsiusToFahrenheit()` | Convert Celsius to Fahrenheit with rounding |
| `expandCardinalDirection()` | Map abbreviations to full names (`"NE"` → `"northeast"`) |
| `buildWindDirectionDict()` | Build proper wind direction dict from abbreviation |
| `parseIconURL()` | Parse NWS API icon URLs into `{icon, base}` format |

## Performance Benchmarks

### FCP Comparison: `main` vs `experimental-perf`

All measurements are **uncached** (Redis flushed before each request) to represent cold-start, worst-case real-world performance. Cached FCP is consistently sub-100ms on both branches.

| Location | Main FCP (Uncached) | Perf Branch FCP (Uncached) | Improvement |
|---|---|---|---|
| **Near Marquette, MI** | 6.20s | 4.18s | 1.5x faster |
| **Near Denver, CO** | 6.53s | 1.89s | 3.5x faster |
| **Near Chicago, IL** | 4.03s | 1.50s | 2.7x faster |
| **Near Los Angeles, CA** | 5.98s | 0.62s | 9.6x faster |
| **Near Miami, FL** | 8.10s | 0.71s | 11.4x faster |
| **Near Seattle, WA** | 6.51s | 0.94s | 6.9x faster |
| **Near New York, NY** | 7.18s | 0.89s | 8.1x faster |
| **Near Austin, TX** | 4.92s | 0.92s | 5.3x faster |
| **Near Phoenix, AZ** | 5.76s | 0.49s | 11.8x faster |
| **Near Boston, MA** | 8.67s | 0.77s | 11.3x faster |

**Average improvement: ~7.2x faster uncached FCP.**

### Interpretation Notes

1. **Cold-Start Penalty (Marquette, MI):** Marquette is the first location queried in the testing script. Its higher uncached FCP (4.18s) is a classic "cold start" penalty—the first request must wait for the Docker container to initialize the worker, compile templates, and establish the database connection pool. Subsequent requests benefit from a warm environment.

2. **End-to-End Overhead:** While the optimized Django view returns the skeleton HTML in **< 10ms**, the FCP metric measures the complete end-to-end time including Playwright browser startup, network navigation through Docker proxy, HTML parsing, and blocking CSS loading. In production with CDN caching, these numbers will be significantly lower.

### Running the Benchmark

```bash
# Run FCP benchmark for the current branch
node tests/performance/fcp_benchmark.js experimental-perf

# Compare results (requires both main and experimental-perf JSON files)
node tests/performance/generate_fcp_table.js
```

## Visual Demonstrations

The following screencasts demonstrate the lazy-loading architecture with the Go interop backend for uncached locations. Note the instant skeleton render followed by progressive content loading.

**Denver, CO (Uncached) - Performance Branch**
![Denver Uncached Perf](videos/Denver_CO_uncached_experimental-perf.webm)

**Austin, TX (Uncached) - Performance Branch**
![Austin Uncached Perf](videos/Austin_TX_uncached_experimental-perf.webm)

**New York, NY (Uncached) - Performance Branch**
![New York Uncached Perf](videos/New_York_NY_uncached_experimental-perf.webm)

## Reverted Changes

- **Reverted JS Formatting**: Unintended formatting changes in the `api-interop-layer` (trailing commas, `if` statement spacing) were reverted so the merge request diff focuses exclusively on the architectural changes.
- **Linting Verification**: All newly added JS files strictly follow the repository's ESLint rules and Prettier configuration.
