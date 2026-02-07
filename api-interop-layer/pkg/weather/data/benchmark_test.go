package data

import (
	"testing"
	"time"
)

func BenchmarkPostProcessAlerts(b *testing.B) {
	// Generate sample alerts
	count := 1000
	alerts := make([]Alert, count)
	for i := 0; i < count; i++ {
		alerts[i] = Alert{
			ID: "1",
			Properties: map[string]interface{}{
				"event": "Tsunami Warning",
				"onset": time.Now().Add(time.Duration(i) * time.Hour).Format(time.RFC3339),
				"ends":  time.Now().Add(time.Duration(i+1) * time.Hour).Format(time.RFC3339),
			},
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Clone alerts to avoid modifying same array repeatedly if we were mutating original (but we process slice elements)
		// PostProcessAlerts modifies alerts in place.
		// For benchmark, we can just run it. The modification (Timestamp parsing) is idempotent (re-parsing same string).
		// Wait, alerts structure Onset/Finish fields are populated.
		// It's fine.
		PostProcessAlerts(alerts, "UTC")
	}
}

func BenchmarkAFDParser(b *testing.B) {
	text := "000\nNOUS42 KWNO 010000\nAFDTEST\n\n.PREAMBLE...\nSome preamble text.\n\n.SYNOPSIS...\nSynopsis content.\nAnd more content.\n\n.DISCUSSION...\nDiscussion content.\n\n$$"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		p := NewAFDParser(text)
		p.Parse()
		p.GetStructureForTwig()
	}
}
