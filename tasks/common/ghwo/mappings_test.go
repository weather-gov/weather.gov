package ghwo

import (
	"testing"
	// "reflect"
)

func TestGetFallbackLevelName(t *testing.T) {
	t.Run("will provide a descriptive error LevelName when the level is beyond the given scale", func(t *testing.T) {
		expected := "Level 7 of 4"
		actual := GetFallbackLevelName(7, 4)

		if expected != actual {
			t.Errorf("Expected %s to equal %s", actual, expected)
		}
	})

	t.Run("will provide a descriptive error LevelName when the scale is not in our fallback set", func(t *testing.T) {
		expected := "Level 0 of 100"
		actual := GetFallbackLevelName(0, 100)

		if actual != expected {
			t.Errorf("Expected %s to equal %s", actual, expected)
		}
	})
}
