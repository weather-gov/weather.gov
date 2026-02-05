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

Regression testing is critical to ensure that changes do not break existing functionality. We use `mocha` and `chai` for our test suite.

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

We track performance metrics over time. The results are stored in `api-interop-layer/perf-results`.

| Test Name | Date | Mean Duration (ms) | P95 Duration (ms) |
| :--- | :--- | :--- | :--- |
| **Parsing Large JSON** | 2023-10-27 | 150 | 200 |
| **Gridpoint Caching** | 2023-10-27 | 45 | 60 |
| *(Example Data - Run `npm run test:perf` for latest)* | | | |

> [!NOTE]
> Detailed performance logs can be found in the `perf-results` directory.

## Definitions

For schema definitions and property details, see the [Definitions](definitions/index.md) section.
