package data

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// ParseISODuration parses basic ISO 8601 durations like PT12H, P1D, etc.
// Caveat: Only supports what dayjs likely supports for weather data (PnYnMnDTnHnMnS).
// Go's time.Duration is nanoseconds, so limited range (approx 290 years).
func ParseISODuration(iso string) (time.Duration, error) {
	// Simple regex parser
	// Pattern: P(n)Y(n)M(n)DT(n)H(n)M(n)S
	// Note: M can be Month (before T) or Minute (after T). P1M vs PT1M.

	if iso == "" || iso[0] != 'P' {
		return 0, fmt.Errorf("invalid duration format: %s", iso)
	}

	var total time.Duration

	// Split date and time parts
	parts := strings.Split(iso[1:], "T")
	datePart := parts[0]
	timePart := ""
	if len(parts) > 1 {
		timePart = parts[1]
	}

	// Parse Date Part: Y, M, D
	// Note: Months and Years are variable length.
	// Standard library time.AddDate handles years/months/days.
	// But returning time.Duration for Years/Months is ambiguous.
	// However, usually NWS returns PT12H or P1D.
	// If P1M (1 month), dayjs estimates it?
	// For QPF, it's usually hours.
	// Let's implement basics.

	parsePart := func(s string, unit byte) int {
		// find numbers before unit
		// e.g. 12H -> 12.
		// Use regex to capture all units.
		return 0
	}
	_ = parsePart // dummy

	re := regexp.MustCompile(`(\d+)([YMDHMS])`)

	// Date logic
	matches := re.FindAllStringSubmatch(datePart, -1)
	for _, m := range matches {
		val, _ := strconv.Atoi(m[1])
		unit := m[2]
		switch unit {
		case "Y":
			// Approximate 365 days
			total += time.Duration(val) * 24 * time.Hour * 365
		case "M":
			// Approximate 30 days
			total += time.Duration(val) * 24 * time.Hour * 30
		case "D":
			total += time.Duration(val) * 24 * time.Hour
		}
	}

	// Time logic
	matches = re.FindAllStringSubmatch(timePart, -1)
	for _, m := range matches {
		val, _ := strconv.Atoi(m[1])
		unit := m[2]
		switch unit {
		case "H":
			total += time.Duration(val) * time.Hour
		case "M":
			total += time.Duration(val) * time.Minute
		case "S":
			total += time.Duration(val) * time.Second
		}
	}

	return total, nil
}
