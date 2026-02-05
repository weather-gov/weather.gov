# API Interop Layer Documentation

## Overview

The API Interop Layer acts as a middleware between the legacy weather.gov API and the new frontend application. It normalizes data structures, handles caching, and ensures consistent data delivery.

## Technical Details

### Language: TypeScript

The interop layer is written in TypeScript to ensure type safety and better developer experience. The source code is located in `api-interop-layer/src`.

**Key Technologies:**
- **Runtime:** Node.js
- **Framework:** Fastify
- **Language:** TypeScript
- **Database:** PostgreSQL (for caching/persistence)

## Testing

### Regression Testing

Regression testing is critical to ensure that changes do not break existing functionality. We use **Mocha** as the test runner and **Chai** for assertions. Tests are written in TypeScript and executed using `ts-node` loader.

**Running Regression Tests:**
```bash
cd api-interop-layer
npm test
```

### Test Coverage

We aim for high test coverage to maintain code quality. Coverage is measured using `c8`.

**Checking Coverage:**
Running `npm test` will automatically generate a coverage report. The HTML report can be found in `api-interop-layer/coverage/`.

## Performance Testing

Performance is a key metric for the interop layer as it directly impacts user experience.

### Performance Tests

Performance tests are located in `api-interop-layer/src/util/perf/`.

**Running Performance Tests:**
```bash
cd api-interop-layer
npm run test:perf
```

### Performance Results
> Last Updated: 2026-02-05

The following benchmarks track the performance of critical utility functions in the API Interop Layer.

| Function | Mean (ns) | Ops/Sec |
| :--- | :--- | :--- |
| `SentenceCase` | 291 | 3,435,703 |
| `ParagraphSquash` | 292 | 3,428,522 |
| `ConvertProperties` | 1,401 | 713,857 |
| `ConvertTimezone` | 1,494 | 669,276 |
| `ForecastProcessing` | 571,104 | 1,751 |
| `RiskProcessing` | 10,615 | 94,206 |
| `FetchAPIJson` | 304,852 | 3,280 |

*Data from perf-20260205-061427.json*

## Definitions

For schema definitions and property details, see the [Definitions](definitions/index.md) section.
