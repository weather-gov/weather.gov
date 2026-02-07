package weather

import (
	"testing"
)

func TestIcon(t *testing.T) {
	// 1. Standard Case
	t.Run("Standard", func(t *testing.T) {
		input := "https://api.weather.gov/icons/land/day/sct?size=medium"
		result := ParseAPIIcon(input)

		if result.Icon == nil || *result.Icon != "mostly_clear-day.svg" {
			t.Errorf("Expected icon 'mostly_clear-day.svg', got %v", result.Icon)
		}
		if result.Base == nil || *result.Base != "mostly_clear-day" {
			t.Errorf("Expected base 'mostly_clear-day', got %v", result.Base)
		}
	})

	// 2. Invalid Case
	t.Run("Invalid", func(t *testing.T) {
		input := "bob white"
		result := ParseAPIIcon(input)

		if result.Icon != nil {
			t.Errorf("Expected nil icon, got %v", *result.Icon)
		}
		if result.Base != nil {
			t.Errorf("Expected nil base, got %v", *result.Base)
		}
	})

	// 3. Multi-condition Case
	t.Run("MultiCondition", func(t *testing.T) {
		input := "https://api.weather.gov/icons/land/day/sct/bkn?size=medium"
		result := ParseAPIIcon(input)

		if result.Icon == nil || *result.Icon != "mostly_clear-day.svg" {
			t.Errorf("Expected icon 'mostly_clear-day.svg', got %v", result.Icon)
		}
		if result.Base == nil || *result.Base != "mostly_clear-day" {
			t.Errorf("Expected base 'mostly_clear-day', got %v", result.Base)
		}
	})
}
