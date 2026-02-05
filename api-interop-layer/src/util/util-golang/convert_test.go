package util_golang

import (
	"math"
	"reflect"
	"testing"
)

func TestConvertValue(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]interface{}
		expected map[string]interface{}
	}{
		{
			name: "Celsius to Fahrenheit",
			input: map[string]interface{}{
				"unitCode": "wmoUnit:degC",
				"value":    10.0,
			},
			expected: map[string]interface{}{
				"degC": 10.0,
				"degF": 50.0,
			},
		},
		{
			name: "Fahrenheit to Celsius",
			input: map[string]interface{}{
				"unitCode": "wmoUnit:degF",
				"value":    50.0,
			},
			expected: map[string]interface{}{
				"degF": 50.0,
				"degC": 10.0,
			},
		},
		{
			name: "km/h to mph",
			input: map[string]interface{}{
				"unitCode": "wmoUnit:km_h-1",
				"value":    100.0,
			},
			expected: map[string]interface{}{
				"km/h": 100.0,
				"mph":  62.0, // 100 * 0.621371 = 62.1371 -> round(0) = 62
			},
		},
		{
			name: "mph to km/h",
			input: map[string]interface{}{
				"unitCode": "wxgov:mph",
				"value":    60.0,
			},
			expected: map[string]interface{}{
				"mph":  60.0,
				"km/h": 97.0, // 60 * 1.60934 = 96.5604 -> round(0) = 97
			},
		},
		{
			name: "Angle to Cardinal",
			input: map[string]interface{}{
				"unitCode": "wmoUnit:degree_(angle)",
				"value":    0.0,
			},
			expected: map[string]interface{}{
				"degrees":       0.0,
				"cardinalShort": "N",
				"cardinalLong":  "north",
			},
		},
		{
			name: "Pa to mb/inHg",
			input: map[string]interface{}{
				"unitCode": "wmoUnit:Pa",
				"value":    101325.0,
			},
			expected: map[string]interface{}{
				"pa":   101325.0,
				"mb":   1013.0, // /100 -> 1013.25 -> 1013
				"inHg": 29.92,  // /3386.38 -> 29.9213 -> 29.92
			},
		},
		{
			name: "mm to in",
			input: map[string]interface{}{
				"unitCode": "wmoUnit:mm",
				"value":    25.4,
			},
			expected: map[string]interface{}{
				"mm": 25.4,
				"in": 1.0,
			},
		},
		{
			name: "m to ft/mi",
			input: map[string]interface{}{
				"unitCode": "wmoUnit:m",
				"value":    1000.0,
			},
			expected: map[string]interface{}{
				"m":  1000.0,
				"ft": 3281.0, // 1000 * 3.28084 = 3280.84 -> 3281
				"mi": 1.0,    // 1000 * 0.000621371 = 0.621371 -> 1 (round 0)
			},
		},
		{
			name: "Null Value",
			input: map[string]interface{}{
				"unitCode": "wmoUnit:degC",
				"value":    nil,
			},
			expected: map[string]interface{}{
				"degC": nil,
				"degF": nil,
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := ConvertValue(tc.input)

			for k, v := range tc.expected {
				got := result[k]
				if !areEqual(got, v) {
					t.Errorf("Field %s: expected %v, got %v", k, v, got)
				}
			}
		})
	}
}

func TestConvertProperties(t *testing.T) {
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

	result := ConvertProperties(input)

	// Check temp
	temp, ok := result["temp"].(map[string]interface{})
	if !ok {
		t.Fatalf("temp structure invalid")
	}
	if !areEqual(temp["degC"], 20.0) || !areEqual(temp["degF"], 68.0) {
		t.Errorf("Temp conversion incorrect: %v", temp)
	}

	// Check wind
	wind, ok := result["wind"].(map[string]interface{})
	if !ok {
		t.Fatalf("wind structure invalid")
	}
	if !areEqual(wind["km/h"], 10.0) || !areEqual(wind["mph"], 6.0) {
		t.Errorf("Wind conversion incorrect: %v", wind)
	}
}

// Helper to compare values handling nil and float precision
func areEqual(a, b interface{}) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}

	f1, ok1 := toFloatTest(a)
	f2, ok2 := toFloatTest(b)

	if ok1 && ok2 {
		return math.Abs(f1-f2) < 0.001
	}

	return reflect.DeepEqual(a, b)
}

func toFloatTest(v interface{}) (float64, bool) {
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
