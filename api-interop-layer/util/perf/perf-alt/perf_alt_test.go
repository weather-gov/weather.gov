// Alternative Performance Benchmark Suite for Go
//
// Improvements over original approach:
// 1. Uses Go's standard benchmarking with proper warmup (b.ResetTimer)
// 2. Memory allocation tracking with b.ReportAllocs()
// 3. Sub-benchmarks for variations
// 4. Consistent test data with JavaScript benchmarks
// 5. Isolated benchmarks without mutation overhead where possible

package perfalternative

import (
	"testing"
	"time"

	util "wxgov-api-interop-layer/util/util-golang"
)

// ============================================================================
// TEST DATA (matches JavaScript benchmarks)
// ============================================================================

var (
	sentenceCaseInput = "Hello WORLD And Universe Test String"
	titleCaseInput    = "hello world-and universe test string"
	paragraphInput    = "This is a line.\nThis is another line.\nAnd a third.\nFourth line here.\nFifth line."
	timezoneDate      = time.Date(2023, 6, 15, 12, 0, 0, 0, time.UTC)
	timezoneTZ        = "America/New_York"
	timezones         = []string{"America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney", "UTC"}
)

// ============================================================================
// CASE BENCHMARKS
// ============================================================================

func BenchmarkSentenceCase(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.SentenceCase(sentenceCaseInput)
	}
}

func BenchmarkTitleCase(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.TitleCase(titleCaseInput)
	}
}

// ============================================================================
// PARAGRAPH SQUASH BENCHMARKS
// ============================================================================

func BenchmarkParagraphSquash(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.ParagraphSquash(paragraphInput)
	}
}

func BenchmarkParagraphSquash_Short(b *testing.B) {
	input := "Hello\nWorld"
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.ParagraphSquash(input)
	}
}

func BenchmarkParagraphSquash_Long(b *testing.B) {
	// 1000 characters with newlines
	input := ""
	for i := 0; i < 50; i++ {
		input += "This is line number " + string(rune('0'+i%10)) + " of the test.\n"
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.ParagraphSquash(input)
	}
}

// ============================================================================
// CONVERT BENCHMARKS
// ============================================================================

func BenchmarkConvertValue(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Create fresh map each iteration (matches JS spread behavior)
		input := map[string]interface{}{
			"unitCode": "wmoUnit:degC",
			"value":    25.5,
		}
		util.ConvertValue(input)
	}
}

func BenchmarkConvertValue_PreAllocated(b *testing.B) {
	// Pre-allocate slice of maps
	inputs := make([]map[string]interface{}, b.N)
	for i := range inputs {
		inputs[i] = map[string]interface{}{
			"unitCode": "wmoUnit:degC",
			"value":    25.5,
		}
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.ConvertValue(inputs[i])
	}
}

func BenchmarkConvertProperties_6Fields(b *testing.B) {
	template := map[string]interface{}{
		"temperature": map[string]interface{}{
			"unitCode": "wmoUnit:degC",
			"value":    20.0,
		},
		"windSpeed": map[string]interface{}{
			"unitCode": "wmoUnit:km_h-1",
			"value":    15.0,
		},
		"pressure": map[string]interface{}{
			"unitCode": "wmoUnit:Pa",
			"value":    101325.0,
		},
		"humidity": map[string]interface{}{
			"unitCode": "wmoUnit:percent",
			"value":    65.0,
		},
		"visibility": map[string]interface{}{
			"unitCode": "wmoUnit:m",
			"value":    10000.0,
		},
		"windDirection": map[string]interface{}{
			"unitCode": "wmoUnit:degree_(angle)",
			"value":    180.0,
		},
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Deep copy for each run
		input := deepCopyMap(template)
		util.ConvertProperties(input)
	}
}

// ============================================================================
// TIMEZONE BENCHMARKS
// ============================================================================

func BenchmarkConvertTimezone(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = util.ConvertTimezone(timezoneDate, timezoneTZ)
	}
}

func BenchmarkConvertTimezone_MultiTZ(b *testing.B) {
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tz := timezones[i%len(timezones)]
		_, _ = util.ConvertTimezone(timezoneDate, tz)
	}
}

func BenchmarkConvertTimezone_ColdCache(b *testing.B) {
	// This tests the cold cache path (first call to each timezone)
	// Note: Go's sync.Map makes this tricky to reset, so we'll just use many timezones
	manyTimezones := []string{
		"America/New_York", "America/Los_Angeles", "America/Chicago", "America/Denver",
		"Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
		"Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore", "Asia/Dubai",
		"Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland", "Pacific/Honolulu",
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tz := manyTimezones[i%len(manyTimezones)]
		_, _ = util.ConvertTimezone(timezoneDate, tz)
	}
}

// ============================================================================
// ICON BENCHMARKS
// ============================================================================

func BenchmarkParseAPIIcon_Standard(b *testing.B) {
	url := "https://api.weather.gov/icons/land/day/sct?size=medium"
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.ParseAPIIcon(url)
	}
}

func BenchmarkParseAPIIcon_MultiCondition(b *testing.B) {
	url := "https://api.weather.gov/icons/land/day/tsra_sct,40/rain,60"
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.ParseAPIIcon(url)
	}
}

func BenchmarkParseAPIIcon_Invalid(b *testing.B) {
	url := "not a valid url"
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		util.ParseAPIIcon(url)
	}
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func deepCopyMap(m map[string]interface{}) map[string]interface{} {
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
