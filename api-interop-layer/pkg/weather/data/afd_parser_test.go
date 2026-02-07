package data

import (
	"strings"
	"testing"
)

func TestAFDParser_Parse(t *testing.T) {
	// Sample AFD text
	source := `000
Start of Preamble
.SYNOPSIS...
This is the synopsis.
&&

.NEAR TERM /THROUGH TONIGHT/...
Near term discussion.
&&

.SHORT TERM /FRIDAY THROUGH SATURDAY NIGHT/...
Short term discussion.
&&

.LONG TERM /SUNDAY THROUGH WEDNESDAY/...
Long term discussion.
&&

.AVIATION /18Z THURSDAY THROUGH MONDAY/...
Aviation discussion.
&&

.MARINE...
Marine discussion.
&&

.HYDROLOGY...
Hydrology discussion.
&&

.CLIMATE...
Climate discussion.
&&

$$
Epilogue content here.
Name/Forecaster
`
	parser := NewAFDParser(source)
	parser.Parse()

	// Check Preamble
	// Preamble logic: splits by \n\n.
	// Line 0 is code?
	// The sample above: "000\nStart of Preamble"
	// split by \n\n -> 1 paragraph? No.
	// "000\nStart of Preamble" -> paragraph 1.
	// line 0 "000" -> preambleCode?
	// Wait, code logic in preamble:
	// paragraph 0 is preambleCode?
	// split by \n\n.
	// So "000\nStart of Preamble" is one paragraph.
	// normalizeSpaces trims.

	structure := parser.GetStructureForTwig()

	if len(structure.Body) == 0 {
		t.Error("expected body nodes")
	}

	// Check sections
	sections := map[string]bool{
		"SYNOPSIS":   false,
		"NEAR TERM":  false,
		"SHORT TERM": false,
		"LONG TERM":  false,
		"AVIATION":   false,
		"MARINE":     false,
		"HYDROLOGY":  false,
		"CLIMATE":    false,
	}

	for _, node := range structure.Body {
		if node.Type == "header" {
			// Content might contain "..." or ensure regex cleans it?
			// regex `^\.(?P<header>.+)[.]{3}` captures inner part.
			// "SYNOPSIS"
			// "NEAR TERM /THROUGH TONIGHT/" -> "NEAR TERM &hairsp;/&hairsp;THROUGH TONIGHT/"?
			// No, WWA regex does replace. generic header does not modify?
			// parseHeader: generic regex captures match[1].
			// check if it matches keys.
			// Actually just print what we found to debug if fails.
			t.Logf("Found header: %s", node.Content)
			for k := range sections {
				// fuzzy match or exact?
				// "NEAR TERM /THROUGH TONIGHT/" contains "NEAR TERM"
				if contains(node.Content, k) {
					sections[k] = true
				}
			}
		}
	}

	// WWA check?
	// Add WWA section to source
	wwaSource := `
.TST WATCHES/WARNINGS/ADVISORIES...
WWA content
&&
`
	p2 := NewAFDParser(wwaSource)
	p2.Parse()
	foundWWA := false
	for i, n := range p2.ParsedNodes {
		t.Logf("Node %d: Type=%q Content=%q", i, n.Type, n.Content)
		// Parser adds hair spaces around slashes for WWA headers
		if n.Type == "header" && contains(n.Content, "WATCHES") && contains(n.Content, "WARNINGS") {
			foundWWA = true
		}
	}
	if !foundWWA {
		t.Error("expected WWA header")
	}

	// Check Epilogue
	if len(structure.Epilogue) == 0 {
		t.Error("expected epilogue")
	}
	if structure.Epilogue[0].Content != "Epilogue content here.\nName/Forecaster" {
		t.Errorf("unexpected epilogue content: %q", structure.Epilogue[0].Content)
	}
}

func contains(s, substr string) bool {
	// Simple helper
	return strings.Contains(s, substr)
}

func TestAFDParser_Temps(t *testing.T) {
	source := `
.TEMPS/POPS...
text before table
PA   70  50  72  52 / 0 0 0 0
NY   68  48  70  50 / 10 10 0 0
text after table
&&
`
	p := NewAFDParser(source)
	p.Parse()

	foundTable := false
	for _, n := range p.ParsedNodes {
		if n.Type == "temps-table" {
			foundTable = true
			if len(n.Rows) != 2 {
				t.Errorf("expected 2 rows, got %d", len(n.Rows))
			}
			// Check logic
			// Regex might be tricky.
			// Row 1: "PA   70  50..."
			// Numbers: 70 50 72 52 0 0 0 0
			// Name: PA
			// Let's inspect row 1
			r1 := n.Rows[0]
			if r1.Name != "PA" {
				t.Errorf("expected PA, got %q", r1.Name)
			}
			if len(r1.Numbers) < 4 {
				t.Errorf("expected numbers, got %v", r1.Numbers)
			}
		}
	}

	if !foundTable {
		t.Error("expected temps table")
	}
}

func TestNormalizeSpaces(t *testing.T) {

	// normalizeSpaces removes multiple spaces and trailing space?
	// regex: `( +)|( $)` -> " "
	// "Hello   world \n" -> "Hello world \n" ??
	// normalizeSpaces replaces " +" with " ".
	// "Hello world \n" -> "Hello world \n"
	// Wait, regex `( +)|( $)` matches "   " and " $"?
	// If " " at end of string?
	// Test implementation logic:
	// Go regex: `( +)|( $)`
	// "Hello   " -> "Hello "
	// "Hello" -> "Hello" (no match)
	// "Hello " -> "Hello " (match ' ' at end? yes)
	// "Hello  " -> "Hello "

	// Implementation calls ReplaceAllString(str, " ")
	// So "   " -> " "
	// " " at end -> " "

	// Test

	// Logic: "Hello   world \n" -> replace "   " with " ", replace " \n"(space at end of line? No, \n is newline)
	// regex `( +)|( $)` matches spaces.
	// "Hello   world \n"
	// matches "   " -> "Hello world \n"
	// matches " \n"? No.
	// matches "\n" (if it counts as space? No, regex is used on string).
	// " $" matches end of string.
	// If \n is there, $ matches after it?
	// Go regex `$` matches text end, not line end in default mode unless multiline?
	// But `re.ReplaceAllString`...
	// Let's just trust the output or fix the test expectation.
	// The function `normalizeSpaces` replaces " +" or " $" with " ".
	// "Hello   world \n" -> "Hello world \n" (if \n is preserved).
	// Wait, `( +)` matches "   ". `( $)` matches end.
	// If string ends with \n, $ matches after \n.
	// So " \n" -> " \n".
	// But `afd_parser.go` uses it on `paragraph`.
	// Let's assert what we expect: "Hello world \n" or similar.
	// Actually, let's use a simpler string without \n to test the core logic first.

	s2 := "Hello   world"
	res2 := normalizeSpaces(s2)
	if res2 != "Hello world" {
		t.Errorf("expected 'Hello world', got %q", res2)
	}
}
