package util_golang

import (
	"testing"
)

func TestParagraphSquash(t *testing.T) {
	input := "This is a\nsentence."
	expected := "This is a sentence."
	result := ParagraphSquash(input)
	if result != expected {
		t.Errorf("Expected %q, got %q", expected, result)
	}
}
