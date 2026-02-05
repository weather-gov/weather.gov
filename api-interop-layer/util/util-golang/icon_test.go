package util_golang

import (
	"testing"
)

func TestIcon(t *testing.T) {
	input := "https://api.weather.gov/icons/land/day/few?size=medium"

	result := ParseAPIIcon(input)

	if result.Icon == nil {
		t.Errorf("Result missing 'icon' field")
	}
	if result.Base == nil {
		t.Errorf("Result missing 'base' field")
	}
}
