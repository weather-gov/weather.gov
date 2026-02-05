// Comprehensive Test Suite for Utility Functions
//
// This test file provides a complete regression test suite for all utility functions
// in the api-interop-layer. Tests are designed to be equivalent to the JavaScript test suite
// for cross-validation purposes.
//
// Coverage: case, convert, paragraphSquash, icon, timezone

package tests

import (
	"math"
	"testing"
	"time"

	util "wxgov-api-interop-layer/util/util-golang"
)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

func floatEquals(a, b float64, tolerance float64) bool {
	return math.Abs(a-b) < tolerance
}

func toFloat(v interface{}) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case int:
		return float64(val), true
	case int64:
		return float64(val), true
	}
	return 0, false
}

// ============================================================================
// CASE UTILITIES TESTS
// ============================================================================

func TestSentenceCase(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{"basic two words", "Hello World", "Hello world"},
		{"all uppercase", "HELLO WORLD", "HELLO wORLD"},
		{"single lowercase word", "hello", "hello"},
		{"single capitalized word", "Hello", "Hello"},
		{"empty string", "", ""},
		{"three words", "Hello World Test", "Hello world test"},
		{"single letter words", "A B C D", "A b c d"},
		{"double space", "Hello  World", "Hello  world"},
		{"sentence", "The Quick Brown Fox", "The quick brown fox"},
		{"numbers and letters", "123 ABC", "123 aBC"},
		{"hyphenated (no space)", "Hello-World", "Hello-World"},
		{"with punctuation", "Hello World!", "Hello world!"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := util.SentenceCase(tc.input)
			if result != tc.expected {
				t.Errorf("SentenceCase(%q) = %q, expected %q", tc.input, result, tc.expected)
			}
		})
	}
}

func TestTitleCase(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{"basic two words", "hello world", "Hello World"},
		{"all uppercase", "HELLO WORLD", "Hello World"},
		{"single word", "hello", "Hello"},
		{"empty string", "", ""},
		{"sentence", "the quick brown fox", "The Quick Brown Fox"},
		{"numbers and letters", "123 abc", "123 Abc"},
		{"hyphenated word", "foo-bar", "Foo-bar"},
		{"single letter words", "a b c", "A B C"},
		{"double space", "hello  world", "Hello  World"},
		{"mixed case input", "already Title Case", "Already Title Case"},
		{"mixed all caps and word", "ALLCAPS word", "Allcaps Word"},
		{"with underscore", "test_underscore", "Test_underscore"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := util.TitleCase(tc.input)
			if result != tc.expected {
				t.Errorf("TitleCase(%q) = %q, expected %q", tc.input, result, tc.expected)
			}
		})
	}
}

// ============================================================================
// CONVERT UTILITIES TESTS
// ============================================================================

func TestConvertValue_Temperature(t *testing.T) {
	t.Run("Celsius to Fahrenheit (freezing)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:degC", "value": 0.0}
		result := util.ConvertValue(input)
		if result["degC"] != 0.0 {
			t.Errorf("degC = %v, expected 0", result["degC"])
		}
		if result["degF"] != 32.0 {
			t.Errorf("degF = %v, expected 32", result["degF"])
		}
	})

	t.Run("Celsius to Fahrenheit (positive)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:degC", "value": 10.0}
		result := util.ConvertValue(input)
		if result["degC"] != 10.0 {
			t.Errorf("degC = %v, expected 10", result["degC"])
		}
		if result["degF"] != 50.0 {
			t.Errorf("degF = %v, expected 50", result["degF"])
		}
	})

	t.Run("Celsius to Fahrenheit (negative -40)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:degC", "value": -40.0}
		result := util.ConvertValue(input)
		if result["degC"] != -40.0 {
			t.Errorf("degC = %v, expected -40", result["degC"])
		}
		if result["degF"] != -40.0 {
			t.Errorf("degF = %v, expected -40", result["degF"])
		}
	})

	t.Run("Fahrenheit to Celsius", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:degF", "value": 50.0}
		result := util.ConvertValue(input)
		if result["degF"] != 50.0 {
			t.Errorf("degF = %v, expected 50", result["degF"])
		}
		if result["degC"] != 10.0 {
			t.Errorf("degC = %v, expected 10", result["degC"])
		}
	})

	t.Run("Fahrenheit to Celsius (freezing)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:degF", "value": 32.0}
		result := util.ConvertValue(input)
		if result["degF"] != 32.0 {
			t.Errorf("degF = %v, expected 32", result["degF"])
		}
		if result["degC"] != 0.0 {
			t.Errorf("degC = %v, expected 0", result["degC"])
		}
	})
}

func TestConvertValue_Speed(t *testing.T) {
	t.Run("km/h to mph", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:km_h-1", "value": 100.0}
		result := util.ConvertValue(input)
		if result["km/h"] != 100.0 {
			t.Errorf("km/h = %v, expected 100", result["km/h"])
		}
		if result["mph"] != 62.0 {
			t.Errorf("mph = %v, expected 62", result["mph"])
		}
	})

	t.Run("km/h to mph (zero)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:km_h-1", "value": 0.0}
		result := util.ConvertValue(input)
		if result["km/h"] != 0.0 {
			t.Errorf("km/h = %v, expected 0", result["km/h"])
		}
		if result["mph"] != 0.0 {
			t.Errorf("mph = %v, expected 0", result["mph"])
		}
	})

	t.Run("mph to km/h", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wxgov:mph", "value": 60.0}
		result := util.ConvertValue(input)
		if result["mph"] != 60.0 {
			t.Errorf("mph = %v, expected 60", result["mph"])
		}
		if result["km/h"] != 97.0 {
			t.Errorf("km/h = %v, expected 97", result["km/h"])
		}
	})

	t.Run("mph to km/h (small value)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wxgov:mph", "value": 10.0}
		result := util.ConvertValue(input)
		if result["mph"] != 10.0 {
			t.Errorf("mph = %v, expected 10", result["mph"])
		}
		if result["km/h"] != 16.0 {
			t.Errorf("km/h = %v, expected 16", result["km/h"])
		}
	})
}

func TestConvertValue_Pressure(t *testing.T) {
	t.Run("Pa to mb and inHg (standard atmosphere)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:Pa", "value": 101325.0}
		result := util.ConvertValue(input)

		if result["pa"] != 101325.0 {
			t.Errorf("pa = %v, expected 101325", result["pa"])
		}
		if result["mb"] != 1013.0 {
			t.Errorf("mb = %v, expected 1013", result["mb"])
		}

		inHg, ok := toFloat(result["inHg"])
		if !ok || !floatEquals(inHg, 29.92, 0.01) {
			t.Errorf("inHg = %v, expected 29.92", result["inHg"])
		}
	})

	t.Run("Pa to mb and inHg (low pressure)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:Pa", "value": 98000.0}
		result := util.ConvertValue(input)

		if result["pa"] != 98000.0 {
			t.Errorf("pa = %v, expected 98000", result["pa"])
		}
		if result["mb"] != 980.0 {
			t.Errorf("mb = %v, expected 980", result["mb"])
		}

		inHg, ok := toFloat(result["inHg"])
		if !ok || !floatEquals(inHg, 28.94, 0.01) {
			t.Errorf("inHg = %v, expected 28.94", result["inHg"])
		}
	})
}

func TestConvertValue_Length(t *testing.T) {
	t.Run("mm to in", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:mm", "value": 25.4}
		result := util.ConvertValue(input)

		if result["mm"] != 25.4 {
			t.Errorf("mm = %v, expected 25.4", result["mm"])
		}
		if result["in"] != 1.0 {
			t.Errorf("in = %v, expected 1.0", result["in"])
		}
	})

	t.Run("mm to in (small value)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:mm", "value": 1.0}
		result := util.ConvertValue(input)

		if result["mm"] != 1.0 {
			t.Errorf("mm = %v, expected 1.0", result["mm"])
		}

		inVal, ok := toFloat(result["in"])
		if !ok || !floatEquals(inVal, 0.04, 0.01) {
			t.Errorf("in = %v, expected ~0.04", result["in"])
		}
	})

	t.Run("m to ft and mi", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:m", "value": 1000.0}
		result := util.ConvertValue(input)

		if result["m"] != 1000.0 {
			t.Errorf("m = %v, expected 1000", result["m"])
		}
		if result["ft"] != 3281.0 {
			t.Errorf("ft = %v, expected 3281", result["ft"])
		}
		if result["mi"] != 1.0 {
			t.Errorf("mi = %v, expected 1", result["mi"])
		}
	})

	t.Run("m to ft and mi (larger value)", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:m", "value": 10000.0}
		result := util.ConvertValue(input)

		if result["m"] != 10000.0 {
			t.Errorf("m = %v, expected 10000", result["m"])
		}
		if result["ft"] != 32808.0 {
			t.Errorf("ft = %v, expected 32808", result["ft"])
		}
		if result["mi"] != 6.0 {
			t.Errorf("mi = %v, expected 6", result["mi"])
		}
	})
}

func TestConvertValue_Cardinal(t *testing.T) {
	cardinalTests := []struct {
		degrees      float64
		shortCard    string
		longCard     string
	}{
		{0, "N", "north"},
		{22, "N", "north"},
		{23, "NE", "northeast"},
		{45, "NE", "northeast"},
		{67, "NE", "northeast"},
		{68, "E", "east"},
		{90, "E", "east"},
		{112, "E", "east"},
		{113, "SE", "southeast"},
		{135, "SE", "southeast"},
		{157, "SE", "southeast"},
		{158, "S", "south"},
		{180, "S", "south"},
		{202, "S", "south"},
		{203, "SW", "southwest"},
		{225, "SW", "southwest"},
		{247, "SW", "southwest"},
		{248, "W", "west"},
		{270, "W", "west"},
		{292, "W", "west"},
		{293, "NW", "northwest"},
		{315, "NW", "northwest"},
		{337, "NW", "northwest"},
		{338, "N", "north"},
		{360, "N", "north"},
	}

	for _, tc := range cardinalTests {
		t.Run(string(rune(tc.degrees)), func(t *testing.T) {
			input := map[string]interface{}{"unitCode": "wmoUnit:degree_(angle)", "value": tc.degrees}
			result := util.ConvertValue(input)

			if result["degrees"] != tc.degrees {
				t.Errorf("degrees = %v, expected %v", result["degrees"], tc.degrees)
			}
			if result["cardinalShort"] != tc.shortCard {
				t.Errorf("cardinalShort = %v, expected %v", result["cardinalShort"], tc.shortCard)
			}
			if result["cardinalLong"] != tc.longCard {
				t.Errorf("cardinalLong = %v, expected %v", result["cardinalLong"], tc.longCard)
			}
		})
	}
}

func TestConvertValue_NullHandling(t *testing.T) {
	t.Run("null temperature", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:degC", "value": nil}
		result := util.ConvertValue(input)

		if result["degC"] != nil {
			t.Errorf("degC = %v, expected nil", result["degC"])
		}
		if result["degF"] != nil {
			t.Errorf("degF = %v, expected nil", result["degF"])
		}
	})

	t.Run("null speed", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:km_h-1", "value": nil}
		result := util.ConvertValue(input)

		if result["km/h"] != nil {
			t.Errorf("km/h = %v, expected nil", result["km/h"])
		}
		if result["mph"] != nil {
			t.Errorf("mph = %v, expected nil", result["mph"])
		}
	})

	t.Run("null pressure", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "wmoUnit:Pa", "value": nil}
		result := util.ConvertValue(input)

		if result["pa"] != nil {
			t.Errorf("pa = %v, expected nil", result["pa"])
		}
		if result["mb"] != nil {
			t.Errorf("mb = %v, expected nil", result["mb"])
		}
		if result["inHg"] != nil {
			t.Errorf("inHg = %v, expected nil", result["inHg"])
		}
	})
}

func TestConvertValue_UnknownUnits(t *testing.T) {
	t.Run("unknown unitCode returns unchanged", func(t *testing.T) {
		input := map[string]interface{}{"unitCode": "unknown:unit", "value": 100.0}
		result := util.ConvertValue(input)

		if result["unitCode"] != "unknown:unit" {
			t.Errorf("unitCode was modified, expected unchanged")
		}
		if result["value"] != 100.0 {
			t.Errorf("value was modified, expected unchanged")
		}
	})
}

func TestConvertProperties(t *testing.T) {
	t.Run("convert multiple properties", func(t *testing.T) {
		input := map[string]interface{}{
			"temp": map[string]interface{}{
				"unitCode": "wmoUnit:degC",
				"value":    20.0,
			},
			"wind": map[string]interface{}{
				"unitCode": "wmoUnit:km_h-1",
				"value":    10.0,
			},
			"other": "ignore",
		}

		result := util.ConvertProperties(input)

		temp := result["temp"].(map[string]interface{})
		if temp["degC"] != 20.0 {
			t.Errorf("temp.degC = %v, expected 20", temp["degC"])
		}
		if temp["degF"] != 68.0 {
			t.Errorf("temp.degF = %v, expected 68", temp["degF"])
		}

		wind := result["wind"].(map[string]interface{})
		if wind["km/h"] != 10.0 {
			t.Errorf("wind.km/h = %v, expected 10", wind["km/h"])
		}
		if wind["mph"] != 6.0 {
			t.Errorf("wind.mph = %v, expected 6", wind["mph"])
		}

		if result["other"] != "ignore" {
			t.Errorf("other = %v, expected 'ignore'", result["other"])
		}
	})

	t.Run("handle mixed null and values", func(t *testing.T) {
		input := map[string]interface{}{
			"temp": map[string]interface{}{
				"unitCode": "wmoUnit:degC",
				"value":    nil,
			},
			"pressure": map[string]interface{}{
				"unitCode": "wmoUnit:Pa",
				"value":    101325.0,
			},
		}

		result := util.ConvertProperties(input)

		temp := result["temp"].(map[string]interface{})
		if temp["degC"] != nil {
			t.Errorf("temp.degC = %v, expected nil", temp["degC"])
		}
		if temp["degF"] != nil {
			t.Errorf("temp.degF = %v, expected nil", temp["degF"])
		}

		pressure := result["pressure"].(map[string]interface{})
		if pressure["pa"] != 101325.0 {
			t.Errorf("pressure.pa = %v, expected 101325", pressure["pa"])
		}
		if pressure["mb"] != 1013.0 {
			t.Errorf("pressure.mb = %v, expected 1013", pressure["mb"])
		}
	})
}

// ============================================================================
// PARAGRAPH SQUASH TESTS
// ============================================================================

func TestParagraphSquash(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{"single newline between chars", "This is a\nsentence.", "This is a sentence."},
		{"double newline (preserved)", "Paragraph one.\n\nParagraph two.", "Paragraph one.\n\nParagraph two."},
		{"no newlines", "No newlines here.", "No newlines here."},
		{"empty string", "", ""},
		{"newline at start", "\nHello world", "\nHello world"},
		{"newline at end", "Hello world\n", "Hello world\n"},
		{"multiple single newlines", "Line one\nLine two\nLine three", "Line one Line two Line three"},
		{"mixed single and double newlines", "Para one\nContinued.\n\nPara two\nMore.", "Para one Continued.\n\nPara two More."},
		{"triple newlines", "Section one.\n\n\nSection two.", "Section one.\n\n\nSection two."},
		{"complex paragraph with all cases", "First line\ncontinues here.\n\nSecond paragraph\nalso continues.\n\n\nThird section.", "First line continues here.\n\nSecond paragraph also continues.\n\n\nThird section."},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := util.ParagraphSquash(tc.input)
			if result != tc.expected {
				t.Errorf("ParagraphSquash(%q) = %q, expected %q", tc.input, result, tc.expected)
			}
		})
	}
}

// ============================================================================
// ICON PARSING TESTS
// ============================================================================

func TestParseAPIIcon_Valid(t *testing.T) {
	validIconTests := []struct {
		name string
		url  string
		icon string
		base string
	}{
		{"day/sct (mostly clear)", "https://api.weather.gov/icons/land/day/sct?size=medium", "mostly_clear-day.svg", "mostly_clear-day"},
		{"night/sct (mostly clear night)", "https://api.weather.gov/icons/land/night/sct?size=medium", "mostly_clear-night.svg", "mostly_clear-night"},
		{"day/few (few clouds)", "https://api.weather.gov/icons/land/day/few", "mostly_clear-day.svg", "mostly_clear-day"},
		{"day/skc (clear)", "https://api.weather.gov/icons/land/day/skc", "clear-day.svg", "clear-day"},
		{"night/skc (clear night)", "https://api.weather.gov/icons/land/night/skc", "clear-night.svg", "clear-night"},
		{"day/bkn (mostly cloudy)", "https://api.weather.gov/icons/land/day/bkn", "mostly_cloudy-day.svg", "mostly_cloudy-day"},
		{"day/ovc (cloudy overcast)", "https://api.weather.gov/icons/land/day/ovc", "cloudy_overcast.svg", "cloudy_overcast"},
		{"day/rain (rain)", "https://api.weather.gov/icons/land/day/rain", "rain.svg", "rain"},
		{"day/tsra (thunderstorm)", "https://api.weather.gov/icons/land/day/tsra", "thunderstorm.svg", "thunderstorm"},
		{"day/snow (snow)", "https://api.weather.gov/icons/land/day/snow", "snow.svg", "snow"},
		{"day/fog (fog)", "https://api.weather.gov/icons/land/day/fog", "fog.svg", "fog"},
	}

	for _, tc := range validIconTests {
		t.Run(tc.name, func(t *testing.T) {
			result := util.ParseAPIIcon(tc.url)
			if result.Icon == nil || *result.Icon != tc.icon {
				t.Errorf("Icon = %v, expected %v", result.Icon, tc.icon)
			}
			if result.Base == nil || *result.Base != tc.base {
				t.Errorf("Base = %v, expected %v", result.Base, tc.base)
			}
		})
	}
}

func TestParseAPIIcon_MultiCondition(t *testing.T) {
	t.Run("day/sct/bkn uses first condition", func(t *testing.T) {
		result := util.ParseAPIIcon("https://api.weather.gov/icons/land/day/sct/bkn?size=medium")
		if result.Icon == nil || *result.Icon != "mostly_clear-day.svg" {
			t.Errorf("Icon = %v, expected mostly_clear-day.svg", result.Icon)
		}
		if result.Base == nil || *result.Base != "mostly_clear-day" {
			t.Errorf("Base = %v, expected mostly_clear-day", result.Base)
		}
	})

	t.Run("day/rain/tsra uses first condition", func(t *testing.T) {
		result := util.ParseAPIIcon("https://api.weather.gov/icons/land/day/rain/tsra")
		if result.Icon == nil || *result.Icon != "rain.svg" {
			t.Errorf("Icon = %v, expected rain.svg", result.Icon)
		}
		if result.Base == nil || *result.Base != "rain" {
			t.Errorf("Base = %v, expected rain", result.Base)
		}
	})

	t.Run("night/bkn/ovc uses first condition", func(t *testing.T) {
		result := util.ParseAPIIcon("https://api.weather.gov/icons/land/night/bkn/ovc")
		if result.Icon == nil || *result.Icon != "mostly_cloudy-night.svg" {
			t.Errorf("Icon = %v, expected mostly_cloudy-night.svg", result.Icon)
		}
		if result.Base == nil || *result.Base != "mostly_cloudy-night" {
			t.Errorf("Base = %v, expected mostly_cloudy-night", result.Base)
		}
	})
}

func TestParseAPIIcon_PercentageSuffix(t *testing.T) {
	t.Run("strips comma-delimited data", func(t *testing.T) {
		result := util.ParseAPIIcon("https://api.weather.gov/icons/land/day/rain,30")
		if result.Icon == nil || *result.Icon != "rain.svg" {
			t.Errorf("Icon = %v, expected rain.svg", result.Icon)
		}
		if result.Base == nil || *result.Base != "rain" {
			t.Errorf("Base = %v, expected rain", result.Base)
		}
	})

	t.Run("multi-condition with percentages", func(t *testing.T) {
		result := util.ParseAPIIcon("https://api.weather.gov/icons/land/day/tsra_sct,40/rain,60")
		if result.Icon == nil || *result.Icon != "thunderstorm.svg" {
			t.Errorf("Icon = %v, expected thunderstorm.svg", result.Icon)
		}
		if result.Base == nil || *result.Base != "thunderstorm" {
			t.Errorf("Base = %v, expected thunderstorm", result.Base)
		}
	})
}

func TestParseAPIIcon_Invalid(t *testing.T) {
	invalidTests := []struct {
		name string
		url  string
	}{
		{"not a URL", "bob white"},
		{"empty string", ""},
		{"just text", "hello world"},
		{"partial URL", "weather.gov/icons/land/day/sct"},
	}

	for _, tc := range invalidTests {
		t.Run(tc.name, func(t *testing.T) {
			result := util.ParseAPIIcon(tc.url)
			if result.Icon != nil {
				t.Errorf("Icon = %v, expected nil", *result.Icon)
			}
			if result.Base != nil {
				t.Errorf("Base = %v, expected nil", *result.Base)
			}
		})
	}
}

// ============================================================================
// TIMEZONE CONVERSION TESTS
// ============================================================================

func TestConvertTimezone_Correctness(t *testing.T) {
	// Test dates covering different scenarios
	// Note: Avoiding precise DST transition dates to prevent implementation differences
	testDates := []time.Time{
		time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC),   // Winter, standard time
		time.Date(2023, 6, 1, 12, 0, 0, 0, time.UTC),   // Summer, daylight saving
		time.Date(2023, 4, 15, 12, 0, 0, 0, time.UTC),  // Well into DST period
		time.Date(2023, 10, 1, 12, 0, 0, 0, time.UTC),  // Before fall back
		time.Date(2023, 12, 31, 23, 59, 59, 0, time.UTC), // End of year
		time.Date(2024, 2, 29, 12, 0, 0, 0, time.UTC),   // Leap year
	}

	timezones := []string{
		"America/New_York",
		"America/Los_Angeles",
		"America/Chicago",
		"Europe/London",
		"Europe/Paris",
		"Asia/Tokyo",
		"Australia/Sydney",
		"UTC",
		"Pacific/Honolulu",
	}

	for _, testDate := range testDates {
		for _, tz := range timezones {
			t.Run(testDate.Format(time.RFC3339)+"_to_"+tz, func(t *testing.T) {
				result, err := util.ConvertTimezone(testDate, tz)
				if err != nil {
					t.Fatalf("ConvertTimezone error: %v", err)
				}

				// Verify timezone is correct
				if result.Location().String() != tz {
					t.Errorf("Location = %v, expected %v", result.Location(), tz)
				}

				// Load expected location manually to verify
				expectedLoc, _ := time.LoadLocation(tz)
				expected := testDate.In(expectedLoc)

				if result.Year() != expected.Year() {
					t.Errorf("Year = %v, expected %v", result.Year(), expected.Year())
				}
				if result.Month() != expected.Month() {
					t.Errorf("Month = %v, expected %v", result.Month(), expected.Month())
				}
				if result.Day() != expected.Day() {
					t.Errorf("Day = %v, expected %v", result.Day(), expected.Day())
				}
				if result.Hour() != expected.Hour() {
					t.Errorf("Hour = %v, expected %v", result.Hour(), expected.Hour())
				}
				if result.Minute() != expected.Minute() {
					t.Errorf("Minute = %v, expected %v", result.Minute(), expected.Minute())
				}
				if result.Second() != expected.Second() {
					t.Errorf("Second = %v, expected %v", result.Second(), expected.Second())
				}
			})
		}
	}
}

func TestConvertTimezone_SpecificKnown(t *testing.T) {
	t.Run("UTC noon to 7 AM EST (New York winter)", func(t *testing.T) {
		date := time.Date(2023, 1, 15, 12, 0, 0, 0, time.UTC)
		result, err := util.ConvertTimezone(date, "America/New_York")
		if err != nil {
			t.Fatalf("ConvertTimezone error: %v", err)
		}
		if result.Hour() != 7 {
			t.Errorf("Hour = %v, expected 7", result.Hour())
		}
	})

	t.Run("UTC noon to 8 AM EDT (New York summer)", func(t *testing.T) {
		date := time.Date(2023, 7, 15, 12, 0, 0, 0, time.UTC)
		result, err := util.ConvertTimezone(date, "America/New_York")
		if err != nil {
			t.Fatalf("ConvertTimezone error: %v", err)
		}
		if result.Hour() != 8 {
			t.Errorf("Hour = %v, expected 8", result.Hour())
		}
	})

	t.Run("UTC noon to 9 PM Tokyo", func(t *testing.T) {
		date := time.Date(2023, 1, 15, 12, 0, 0, 0, time.UTC)
		result, err := util.ConvertTimezone(date, "Asia/Tokyo")
		if err != nil {
			t.Fatalf("ConvertTimezone error: %v", err)
		}
		if result.Hour() != 21 {
			t.Errorf("Hour = %v, expected 21", result.Hour())
		}
	})

	t.Run("UTC midnight to same time in UTC", func(t *testing.T) {
		date := time.Date(2023, 6, 15, 0, 0, 0, 0, time.UTC)
		result, err := util.ConvertTimezone(date, "UTC")
		if err != nil {
			t.Fatalf("ConvertTimezone error: %v", err)
		}
		if result.Hour() != 0 {
			t.Errorf("Hour = %v, expected 0", result.Hour())
		}
		if result.Day() != 15 {
			t.Errorf("Day = %v, expected 15", result.Day())
		}
	})
}

func TestConvertTimezone_EdgeCases(t *testing.T) {
	t.Run("year boundary (UTC to Sydney)", func(t *testing.T) {
		// Sydney is UTC+11 in summer, so 12:00 UTC on Dec 31 = 23:00 Dec 31 Sydney
		date := time.Date(2023, 12, 31, 12, 0, 0, 0, time.UTC)
		result, err := util.ConvertTimezone(date, "Australia/Sydney")
		if err != nil {
			t.Fatalf("ConvertTimezone error: %v", err)
		}
		if result.Year() != 2023 {
			t.Errorf("Year = %v, expected 2023", result.Year())
		}
		if result.Month() != 12 {
			t.Errorf("Month = %v, expected 12", result.Month())
		}
		if result.Day() != 31 {
			t.Errorf("Day = %v, expected 31", result.Day())
		}
		if result.Hour() != 23 {
			t.Errorf("Hour = %v, expected 23", result.Hour())
		}
	})

	t.Run("date change crossing midnight", func(t *testing.T) {
		// Tokyo is UTC+9, so 20:00 UTC = 05:00 next day Tokyo
		date := time.Date(2023, 6, 15, 20, 0, 0, 0, time.UTC)
		result, err := util.ConvertTimezone(date, "Asia/Tokyo")
		if err != nil {
			t.Fatalf("ConvertTimezone error: %v", err)
		}
		if result.Day() != 16 {
			t.Errorf("Day = %v, expected 16", result.Day())
		}
		if result.Hour() != 5 {
			t.Errorf("Hour = %v, expected 5", result.Hour())
		}
	})

	t.Run("seconds handling", func(t *testing.T) {
		date := time.Date(2023, 6, 15, 12, 30, 45, 0, time.UTC)
		result, err := util.ConvertTimezone(date, "UTC")
		if err != nil {
			t.Fatalf("ConvertTimezone error: %v", err)
		}
		if result.Minute() != 30 {
			t.Errorf("Minute = %v, expected 30", result.Minute())
		}
		if result.Second() != 45 {
			t.Errorf("Second = %v, expected 45", result.Second())
		}
	})

	t.Run("invalid timezone returns error", func(t *testing.T) {
		date := time.Date(2023, 1, 1, 12, 0, 0, 0, time.UTC)
		_, err := util.ConvertTimezone(date, "Mars/Phobos")
		if err == nil {
			t.Error("Expected error for invalid timezone, got nil")
		}
	})
}

func TestConvertTimezone_Cache(t *testing.T) {
	// Verify that repeated calls don't crash
	tz := "America/Denver"
	now := time.Now()

	// First call (miss)
	_, err := util.ConvertTimezone(now, tz)
	if err != nil {
		t.Fatalf("First call failed: %v", err)
	}

	// Second call (hit)
	_, err = util.ConvertTimezone(now, tz)
	if err != nil {
		t.Fatalf("Second call failed: %v", err)
	}

	// Many more calls
	for i := 0; i < 100; i++ {
		_, err = util.ConvertTimezone(now, tz)
		if err != nil {
			t.Fatalf("Call %d failed: %v", i, err)
		}
	}
}
