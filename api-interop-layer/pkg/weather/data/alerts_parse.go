package data

import (
	"fmt"
	"time"
	util_golang "weathergov/api-interop/pkg/weather"
)

// ParseDuration returns a human-readable duration string
func ParseDuration(onset, finish time.Time, timezone string) string {
	// Current time in that timezone
	// util_golang.ConvertTimezone takes time and region.
	nowUTC := time.Now().UTC()
	now, _ := util_golang.ConvertTimezone(nowUTC, timezone)

	// Tomorrow and Later logic
	// tomorrow is start of next day
	// Go doesn't have easy StartOf except manual calculation.
	y, m, d := now.Date()
	tomorrow := time.Date(y, m, d+1, 0, 0, 0, 0, now.Location())
	later := time.Date(y, m, d+2, 0, 0, 0, 0, now.Location())

	// Convert onset/finish to location
	onsetLoc, _ := util_golang.ConvertTimezone(onset, timezone)
	var finishLoc time.Time
	var hasFinish bool
	if !finish.IsZero() {
		finishLoc, _ = util_golang.ConvertTimezone(finish, timezone)
		hasFinish = true
	}

	if onsetLoc.Before(now) || onsetLoc.Equal(now) {
		// Event has begun
		if hasFinish {
			if finishLoc.After(now) || finishLoc.Equal(now) {
				// In middle of event
				if finishLoc.Before(tomorrow) {
					return fmt.Sprintf("until %s today", finishLoc.Format("3:04 PM"))
				}
				return fmt.Sprintf("until %s", finishLoc.Format("Monday 01/02 3:04 PM")) // Format dddd MM/DD h:mm A
			}
			return "has concluded"
		}
		return "is in effect"
	}

	// Future
	onsetHour := onsetLoc.Hour() // 0-23

	if onsetLoc.Before(tomorrow) {
		// Starts later today
		if onsetHour < 12 {
			return "this morning"
		}
		if onsetHour < 18 {
			return "this afternoon"
		}
		return "tonight"
	}

	if onsetLoc.Before(later) {
		// Starts tomorrow
		if onsetHour < 12 {
			return "tomorrow morning"
		}
		if onsetHour < 18 {
			return "tomorrow afternoon"
		}
		return "tomorrow night"
	}

	return onsetLoc.Format("Monday")
}
