# API Interop Layer Utilities

This directory contains utility functions for the beta.weather.gov API interop layer, with implementations in both JavaScript and Go.

## Overview

The Go implementations show significant performance improvements for critical operations:
- **Timezone conversion**: 100-180x faster (down to ~12ns/op)
- **Data transformation** (ConvertProperties): 1.5-2.7x faster
- **Fetch/JSON handling**: ~4.4x faster

An optimized `timezone-new.js` using cached `Intl.DateTimeFormat` achieves ~25x improvement over the original dayjs-based implementation.

See [perf/perf.md](perf/perf.md) and [perf/perf-alt/perf.md](perf/perf-alt/perf.md) for detailed benchmarks.

## Directory Structure

```
util/
├── README.md                 # This file
├── overview.md               # High-level summary of findings
│
├── # JavaScript Utilities
├── case.js                   # String case transformations (sentenceCase, titleCase)
├── convert.js                # Unit conversions (temp, speed, pressure, length, angles)
├── paragraphSquash.js        # Text formatting (newline handling)
├── icon.js                   # NWS API icon URL parsing
├── timezone-new.js           # Optimized timezone conversion
├── fetch.js                  # API fetching with retry logic and caching
├── day.js                    # Day.js date utilities
├── dayjs.timezone.js         # Day.js timezone plugin
├── sleep.js                  # Async sleep utility
├── constants.js              # Shared constants
├── icon.legacyMapping.json   # Icon name mappings
│
├── # JavaScript Tests (co-located)
├── convert.test.js
├── fetch.test.js
├── icon.test.js
├── timezone-new.test.js
│
├── monitoring/               # Logging utilities
│   ├── index.js
│   └── logger.js
│
├── util-golang/              # Go implementations
│   ├── case.go               # SentenceCase, TitleCase
│   ├── convert.go            # ConvertValue, ConvertProperties
│   ├── paragraph_squash.go   # ParagraphSquash
│   ├── icon.go               # ParseAPIIcon
│   ├── timezone.go           # ConvertTimezone
│   ├── fetch.go              # FetchAPIJson with retry/caching
│   ├── redis.go              # Redis client wrapper
│   ├── *_test.go             # Unit tests for each module
│   ├── perf_test.go          # Performance benchmarks
│   └── README-util-golang.md # Go-specific documentation
│
├── tests/                    # Comprehensive regression tests
│   ├── comprehensive-utils.test.js   # JS test suite (166 tests)
│   ├── comprehensive_utils_test.go   # Go test suite (135+ tests)
│   ├── README-util-tests.md          # Test documentation
│   ├── go.mod
│   └── go.sum
│
└── perf/                     # Performance benchmarks
    ├── perf.js               # JS performance tests
    ├── perf.md               # Performance comparison report
    ├── perf_comparison.js    # Side-by-side comparison
    └── perf-alt/             # Alternative benchmark suite
        ├── perf-alt.js       # JS benchmarks with statistics
        ├── perf_alt_test.go  # Go benchmarks
        └── perf.md           # Detailed analysis report
```

## Utilities Reference

| Utility | JS File | Go File | Description |
|---------|---------|---------|-------------|
| **Case** | `case.js` | `util-golang/case.go` | String case transformations |
| **Convert** | `convert.js` | `util-golang/convert.go` | Unit conversions (°C↔°F, km/h↔mph, etc.) |
| **ParagraphSquash** | `paragraphSquash.js` | `util-golang/paragraph_squash.go` | Newline formatting |
| **Icon** | `icon.js` | `util-golang/icon.go` | NWS API icon URL parsing |
| **Timezone** | `timezone-new.js` | `util-golang/timezone.go` | Timezone conversion |
| **Fetch** | `fetch.js` | `util-golang/fetch.go` | API fetching with retry/cache |

## Running the Utilities

### JavaScript

From the `api-interop-layer/` directory:

```javascript
// Import utilities
import { sentenceCase, titleCase } from './util/case.js';
import { convertValue, convertProperties } from './util/convert.js';
import { paragraphSquash } from './util/paragraphSquash.js';
import { parseAPIIcon } from './util/icon.js';
import { convertTimezone } from './util/timezone-new.js';
import { fetchAPIJson } from './util/fetch.js';

// Example usage
const result = convertValue({
  value: 20,
  unitCode: 'wmoUnit:degC'
});
// => { value: 68, unitCode: 'unit:degF' }

const time = convertTimezone(new Date(), 'America/New_York');
```

### Go

From the `api-interop-layer/util/util-golang/` directory:

```go
package main

import (
    "fmt"
    "time"
    util "wxgov-api-interop-layer/util-golang"
)

func main() {
    // Unit conversion
    result := util.ConvertValue(map[string]interface{}{
        "value":    20.0,
        "unitCode": "wmoUnit:degC",
    })
    fmt.Println(result) // map[unitCode:unit:degF value:68]

    // Timezone conversion
    t := time.Now().UTC()
    local, _ := util.ConvertTimezone(t, "America/New_York")
    fmt.Println(local)
}
```

## Running the Tests

### Prerequisites

**JavaScript:**
- Node.js >= 18.20.4
- npm >= 10.7.0
- Dependencies installed (`npm install` in `api-interop-layer/`)

**Go:**
- Go >= 1.21

### JavaScript Tests

From the `api-interop-layer/` directory:

```bash
# Run comprehensive utility tests
LOG_LEVEL=silent npx mocha 'util/tests/comprehensive-utils.test.js' --require mocha.js

# Run with verbose output
npx mocha 'util/tests/comprehensive-utils.test.js' --require mocha.js

# Run all tests (including co-located tests)
npm test
```

### Go Tests

**Unit tests** (from `util/util-golang/`):
```bash
go test -v .
```

**Comprehensive regression tests** (from `util/tests/`):
```bash
go mod tidy
go test -v .
```

### Performance Benchmarks

**JavaScript** (from `api-interop-layer/`):
```bash
node util/perf/perf.js
node util/perf/perf-alt/perf-alt.js
```

**Go** (from `util/util-golang/` or `util/perf/perf-alt/`):
```bash
go test -bench=. -benchmem .
```

## Known Issues

### Redis Connection Bug

A bug was identified in `redis.js` where a `forEach` loop with a `return` statement doesn't properly exit the parent function. This could leave Redis connections open unexpectedly. A fix using `for...of` is demonstrated in `redis-fix.js` at the `api-interop-layer/` root.

**Original (buggy):**
```javascript
REQUIRED_ENV_VARS.forEach((varName) => {
  if (!process.env[varName]) {
    return {};  // Only exits callback, not parent function!
  }
});
```

**Fixed:**
```javascript
for (const varName of REQUIRED_ENV_VARS) {
  if (!process.env[varName]) {
    return {};  // Properly exits parent function
  }
}
```

## Next Steps

1. **Integration Options:**
   - Incorporate Go utilities into current JS packages as compiled binaries
   - Compile to WASM to run in a Lambda@Edge container
   - Compile to WASM to run directly in the browser on CloudFront deployment

2. **Hybrid Approach:**
   - V8's JIT still wins for simple regex-based string operations (SentenceCase/TitleCase)
   - Use Go for performance-critical operations (timezone, data transformation, fetch)

3. **Further Investigation:**
   - Evaluate WASM compilation overhead vs. native Go performance
   - Benchmark WASM in browser vs. Lambda@Edge environments
   - Consider Go → JavaScript transpilation tools as alternative

## Related Documentation

- [util-golang/README-util-golang.md](util-golang/README-util-golang.md) - Go implementation details
- [tests/README-util-tests.md](tests/README-util-tests.md) - Test suite documentation
- [perf/perf.md](perf/perf.md) - Performance comparison report
- [perf/perf-alt/perf.md](perf/perf-alt/perf.md) - Alternative benchmarks with statistics
