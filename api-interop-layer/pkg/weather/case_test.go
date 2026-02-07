package weather

import (
	"testing"
)

func TestCase(t *testing.T) {
	t.Run("SentenceCase", func(t *testing.T) {
		input := "Hello World"
		expected := "Hello world"
		result := SentenceCase(input)
		if result != expected {
			t.Errorf("Expected %q, got %q", expected, result)
		}
	})

	t.Run("TitleCase", func(t *testing.T) {
		input := "hello world"
		expected := "Hello World"
		result := TitleCase(input)
		if result != expected {
			t.Errorf("Expected %q, got %q", expected, result)
		}
	})
}
