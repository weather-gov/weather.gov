# API Interop Layer - Utility Tests

This directory contains comprehensive regression tests for the utility functions in the `api-interop-layer`. Tests are provided in both JavaScript (Mocha/Chai) and Go formats to ensure parity between implementations.

## Overview

The tests cover the following utilities:

| Utility | JS Location | Go Location | Description |
|---------|-------------|-------------|-------------|
| **Case** | `util/case.js` | `util/util-golang/case.go` | String case transformations (sentence, title) |
| **Convert** | `util/convert.js` | `util/util-golang/convert.go` | Unit conversions (temperature, speed, pressure, length, angles) |
| **ParagraphSquash** | `util/paragraphSquash.js` | `util/util-golang/paragraph_squash.go` | Text formatting (single newline removal) |
| **Icon** | `util/icon.js` | `util/util-golang/icon.go` | NWS API icon URL parsing |
| **Timezone** | `util/timezone-new.js` | `util/util-golang/timezone.go` | Timezone conversion |

## Test Files

- `comprehensive-utils.test.js` - JavaScript test suite (166 tests)
- `comprehensive_utils_test.go` - Go test suite (135+ tests)
- `go.mod` - Go module configuration
- `test-run-report_*.md` - Versioned test run reports

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
# Run comprehensive utility tests only
LOG_LEVEL=silent npx mocha 'util/tests/comprehensive-utils.test.js' --require mocha.js

# Run with verbose output
npx mocha 'util/tests/comprehensive-utils.test.js' --require mocha.js

# Run all tests (including existing tests)
npm test
```

Expected output:
```
  166 passing (70ms)
```

### Go Tests

From the `api-interop-layer/util/tests/` directory:

```bash
# First time setup
go mod tidy

# Run tests
go test -v .

# Run with coverage
go test -cover -v .

# Run specific test
go test -v -run TestConvertValue_Temperature .
```

Expected output:
```
PASS
ok  	wxgov-api-interop-layer/tests	0.45s
```

## Test Categories

### Case Utilities
- **sentenceCase**: Converts strings to sentence case (first word capitalized, rest lowercase)
- **titleCase**: Converts strings to title case (each word capitalized)
- Edge cases: empty strings, null/undefined, hyphenated words, punctuation

### Convert Utilities
Tests all unit conversions supported by the API interop layer:

| From | To | Example |
|------|-----|---------|
| °C | °F | 10°C → 50°F |
| °F | °C | 50°F → 10°C |
| km/h | mph | 100 km/h → 62 mph |
| mph | km/h | 60 mph → 97 km/h |
| Pa | mb, inHg | 101325 Pa → 1013 mb, 29.92 inHg |
| mm | in | 25.4 mm → 1 in |
| m | ft, mi | 1000 m → 3281 ft, 1 mi |
| degrees | cardinal | 0° → N, 45° → NE, etc. |

Also tests:
- Null value preservation
- Unknown unit handling
- `convertProperties` for batch conversions

### ParagraphSquash
Handles newline formatting:
- Single newlines between text → replaced with space
- Double/triple newlines → preserved (paragraph breaks)
- Edge cases: newlines at start/end, empty strings

### Icon Parsing
Parses NWS API icon URLs to legacy icon names:
- Standard conditions (sct, few, skc, bkn, ovc, rain, snow, etc.)
- Night variants
- Multi-condition URLs
- Percentage/probability suffixes
- Invalid URL handling

### Timezone Conversion
Tests timezone conversions across multiple scenarios:
- Multiple IANA timezones (America/New_York, Asia/Tokyo, etc.)
- Various dates (winter, summer, leap year, year boundary)
- DST handling
- Date change across midnight
- Cache behavior

## Test Equivalence

Both JS and Go test suites use identical:
- **Input values**: Same test data for both implementations
- **Expected outputs**: Same expected results
- **Test structure**: Parallel test organization

This ensures:
1. **Regression detection**: Changes to either implementation will be caught
2. **Parity verification**: Both implementations behave identically
3. **Migration confidence**: Safe to switch between JS and Go implementations

## Creating Test Reports

To create a new versioned test report:

```bash
# Get current datetime
DATETIME=$(date '+%Y-%m-%d_%H-%M-%S')

# Run tests and capture output
cd api-interop-layer
LOG_LEVEL=silent npx mocha 'util/tests/comprehensive-utils.test.js' --require mocha.js > util/tests/js_output.txt 2>&1

cd util/tests
go test -v . > go_output.txt 2>&1

# Create report (use template from existing reports)
```

## Adding New Tests

### JavaScript

Add to `comprehensive-utils.test.js`:

```javascript
describe("New Utility", () => {
  it("should do something", () => {
    const input = "test";
    const expected = "expected";
    expect(newUtility(input)).to.equal(expected);
  });
});
```

### Go

Add to `comprehensive_utils_test.go`:

```go
func TestNewUtility(t *testing.T) {
  t.Run("should do something", func(t *testing.T) {
    input := "test"
    expected := "expected"
    result := util.NewUtility(input)
    if result != expected {
      t.Errorf("NewUtility(%q) = %q, expected %q", input, result, expected)
    }
  })
}
```

## Troubleshooting

### "Module not found" in Go tests
```bash
cd api-interop-layer/util/tests
go mod tidy
```

### JS tests not finding utilities
Make sure you're running from the `api-interop-layer/` directory:
```bash
cd api-interop-layer
npx mocha 'util/tests/comprehensive-utils.test.js' --require mocha.js
```

### Redis connection errors
Set `LOG_LEVEL=silent` to suppress logging, or ensure Redis is running if testing fetch functionality.

## Test Status

**Last Run**: 2026-02-04  
**JavaScript**: ✅ 166/166 passing  
**Go**: ✅ All tests passing  

See `test-run-report_2026-02-04_20-26-56.md` for detailed results.
