package weather

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// BenchmarkConvertProperties benchmarks the property conversion logic
func BenchmarkConvertProperties(b *testing.B) {
	input := map[string]interface{}{
		"temp": map[string]interface{}{
			"unitCode": "wmoUnit:degC",
			"value":    20.0,
		},
		"wind": map[string]interface{}{
			"unitCode": "wmoUnit:km_h-1",
			"value":    10.0,
		},
		"pressure": map[string]interface{}{
			"unitCode": "wmoUnit:Pa",
			"value":    101325.0,
		},
		"other": "ignore",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Deep copy input for each run to simulate real workload avoiding map mutation side effects if any
		// Although ConvertProperties mutates, benchmarks usually run on fresh data or reset.
		// Since ConvertProperties DOES mutate, we must clone it.
		// But simplistic cloning inside the loop might dominate the benchmark.
		// Let's create a slice of inputs.
		// However, b.N can be huge.
		// We'll clone inside the loop, acknowledging it adds overhead, OR we accept mutation if it's idempotent-ish?
		// ConvertProperties changes structure: "value" removed, "degC" added.
		// Run 2: "degC" exists. UnitCode exists. "value" is gone.
		// It will crash or do nothing.
		// So we MUST clone.

		inCopy := deepCopyMap(input)
		ConvertProperties(inCopy)
	}
}

// BenchmarkSentenceCase benchmarks the sentence casing logic
func BenchmarkSentenceCase(b *testing.B) {
	str := "hello WORLD And universe"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		SentenceCase(str)
	}
}

// BenchmarkTitleCase benchmarks the title casing logic
func BenchmarkTitleCase(b *testing.B) {
	str := "hello world-and universe"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		TitleCase(str)
	}
}

// BenchmarkParagraphSquash benchmarks the paragraph squash logic
func BenchmarkParagraphSquash(b *testing.B) {
	str := "This is a line.\nThis is another line.\nAnd a third."
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ParagraphSquash(str)
	}
}

// BenchmarkFetchAPIJson benchmarks the fetch logic with a mock server
func BenchmarkFetchAPIJson(b *testing.B) {
	// Setup Mock Server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "OK", "message": "Success"}`))
	}))
	defer ts.Close()

	// Override BaseURL
	oldBase := BaseURL
	BaseURL = ts.URL
	defer func() { BaseURL = oldBase }()

	// Disable Redis for pure fetch benchmark or keep it if we want to test Redis?
	// User said "test the speed... can scale for high loads".
	// Testing with Redis adds external dependency.
	// For "utilities performance", maybe we just want the overhead of the Go code?
	// Let's disable Redis to be safe and deterministic, focusing on the Go application logic + HTTP client.
	UseRedis = false

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := FetchAPIJson("/some/path")
		if err != nil {
			b.Fatalf("Fetch failed: %v", err)
		}
	}
}

// BenchmarkConvertTimezone benchmarks the timezone conversion logic
func BenchmarkConvertTimezone(b *testing.B) {
	// 2023-01-01 12:00:00 UTC
	t := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)
	tz := "America/New_York"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := ConvertTimezone(t, tz)
		if err != nil {
			b.Fatalf("ConvertTimezone failed: %v", err)
		}
	}
}

// Helper for deep copy
func deepCopyMap(m map[string]interface{}) map[string]interface{} {
	// Simplest way: JSON roundtrip or manual recursion.
	// For benchmark, let's do manual to be faster than JSON.
	res := make(map[string]interface{})
	for k, v := range m {
		if vm, ok := v.(map[string]interface{}); ok {
			res[k] = deepCopyMap(vm)
		} else {
			res[k] = v
		}
	}
	return res
}
