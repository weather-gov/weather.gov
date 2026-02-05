# Util Golang

This directory contains GoLang ports of the utilities found in the parent `util` directory.
The goal is to provide high-performance, statically typed alternatives to the existing JavaScript utilities, suitable for compilation to WebAssembly (WASM) or native executables.

## Ported Utilities

The following utilities have been ported to Go:

### Case (`case.go`)
- `SentenceCase(str string) string`: Converts a string to sentence case.
- `TitleCase(str string) string`: Converts a string to title case, matching the logic of the original JS utility.

### Convert (`convert.go`)
- `ConvertValue(obj map[string]interface{}) map[string]interface{}`: Converts a single value object based on its `unitCode` or `uom`.
- `ConvertProperties(obj map[string]interface{}) map[string]interface{}`: Recursively searches for and converts properties with unit codes.
- **Supported Units**:
  - `degC` <-> `degF`
  - `km/h` <-> `mph`
  - `mm` <-> `in`
  - `m` <-> `ft`, `mi`
  - `Pa` -> `mb`, `inHg`
  - `degree_(angle)` -> Cardinal directions (N, NE, etc.)

### Icon (`icon.go`)
- `ParseAPIIcon(apiIcon string) IconResult`: Parses a NWS API icon URL and maps it to a legacy icon set using the embedded `icon.legacyMapping.json`.

### Paragraph Squash (`paragraph_squash.go`)
- `ParagraphSquash(str string) string`: Removes single newlines within paragraphs while preserving double newlines.

## Testing

Tests are written in Go and cover the ported functionality.

To run the tests:
```bash
go test -v .
```

## Build

To use these utilities in another Go project, simply import the package:
```go
import "weathergov/util-golang"
```

## Migration Notes

- **Fetch**: The `fetch.js` utility (which includes Redis caching and retry logic) has not yet been ported. It requires a Go Redis client and HTTP client setup.
- **Dependencies**:
  - The `icon.legacyMapping.json` file is embedded into the build using Go's `embed` package.
  - No external Go dependencies are currently required (standard library only).
