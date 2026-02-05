package util_golang

import (
	"sync"
	"time"
)

// locationCache caches time.Location lookups to improve performance,
// mirroring the behavior of the JS implementation.
var locationCache sync.Map

// ConvertTimezone converts a given time to the specified timezone.
// It uses a cache to avoid repeated time.LoadLocation calls.
func ConvertTimezone(t time.Time, timezone string) (time.Time, error) {
	// 1. Try to get from cache
	if loc, ok := locationCache.Load(timezone); ok {
		return t.In(loc.(*time.Location)), nil
	}

	// 2. Load location if not in cache
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.Time{}, err
	}

	// 3. Store in cache
	locationCache.Store(timezone, loc)

	return t.In(loc), nil
}
