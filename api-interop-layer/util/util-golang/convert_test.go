package util_golang

import (
	"testing"
)

func TestConvertValue(t *testing.T) {
	input := map[string]interface{}{
		"unitCode": "wmoUnit:degC",
		"value":    10.0,
	}

	result := ConvertValue(input)

	// Expected: { "degC": 10, "degF": 50 }
	// JSON unmarshals numbers as float64
	expected := map[string]interface{}{
		"degC": 10.0,
		"degF": 50.0,
	}

	// Compare only expected keys, ignoring potential extra keys if any (though logic suggests no extras)
	for k, v := range expected {
		if val, ok := result[k]; !ok || val != v {
			t.Errorf("Key %s: expected %v, got %v", k, v, val)
		}
	}
}

func TestConvertProperties(t *testing.T) {
	input := map[string]interface{}{
		"temp": map[string]interface{}{
			"unitCode": "wmoUnit:degC",
			"value":    10.0,
		},
		"other": "ignore",
	}

	result := ConvertProperties(input)

	temp, ok := result["temp"].(map[string]interface{})
	if !ok {
		t.Fatalf("temp is not a map: %v", result["temp"])
	}

	if temp["degC"] != 10.0 || temp["degF"] != 50.0 {
		t.Errorf("Unexpected conversion result: %v", temp)
	}
}
