package data

import (
	"testing"
	"time"
)

func TestParseDuration(t *testing.T) {
	// Mock time logic by controlling "now" in the function?
	// ParseDuration uses time.Now().
	// To test it deterministically, I might need to inject "now" or mock time.
	// But util_golang.ConvertTimezone uses real time.
	// I'll skip exact string match and check for non-empty string or panic?
	// OR I can set Onset to recent past/future relative to real time.

	now := time.Now()
	onset := now.Add(1 * time.Hour)
	finish := now.Add(2 * time.Hour)

	s := ParseDuration(onset, finish, "UTC")
	if s == "" {
		t.Error("expected duration string")
	}
}

func TestPostProcessAlerts(t *testing.T) {
	// Create sample alerts
	alerts := []Alert{
		{
			ID: "1",
			Properties: map[string]interface{}{
				"event": "Tsunami Warning",
				"onset": time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
				"ends":  time.Now().Add(2 * time.Hour).Format(time.RFC3339),
			},
		},
		{
			ID: "2",
			Properties: map[string]interface{}{
				"event": "Heat Advisory",
				"onset": time.Now().Add(-3 * time.Hour).Format(time.RFC3339),
				"ends":  time.Now().Add(4 * time.Hour).Format(time.RFC3339),
			},
		},
	}

	res := PostProcessAlerts(alerts, "UTC")

	if len(res.Items) != 2 {
		t.Errorf("expected 2 items, got %d", len(res.Items))
	}

	// Check sorting
	// Tsunami Warning (0) vs Heat Advisory (63488).
	// Sort logic: Ascending Priority (small numbers first).
	// So Tsunami Warning should be first.

	if res.Items[0].Event != "Tsunami Warning" {
		t.Errorf("expected Tsunami Warning first (sorted ascending), got %s", res.Items[0].Event)
	}

	// Check Highest Level
	// Logic: min priority -> "warning" (Tsunami).
	if res.HighestLevel != "warning" {
		t.Errorf("expected highest level warning, got %s", res.HighestLevel)
	}
}
