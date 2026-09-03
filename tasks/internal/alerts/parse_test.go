package alerts

import (
	"encoding/json"
	"reflect"
	"testing"
)

const georgiaWatch = `THE NATIONAL WEATHER SERVICE HAS ISSUED A SEVERE THUNDERSTORM WATCH.

IN GEORGIA THIS WATCH INCLUDES 5 COUNTIES

IN NORTH CENTRAL GEORGIA

FANNIN                LUMPKIN               UNION

IN NORTHEAST GEORGIA

HABERSHAM             WHITE

THIS INCLUDES THE CITIES OF BLUE RIDGE, DAHLONEGA, AND CLEVELAND.
`

func marshalNodes(t *testing.T, nodes []any) string {
	t.Helper()
	encoded, err := json.Marshal(nodes)
	if err != nil {
		t.Fatalf("could not marshal nodes: %v", err)
	}
	return string(encoded)
}

func TestParseLocations_StructuredBlock(t *testing.T) {
	locations, description, err := ParseLocations(georgiaWatch)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if locations == nil {
		t.Fatal("expected locations, got nil")
	}

	wantRegions := []Region{
		{Area: "North Central Georgia", Counties: []string{"Fannin", "Lumpkin", "Union"}},
		{Area: "Northeast Georgia", Counties: []string{"Habersham", "White"}},
	}
	if !reflect.DeepEqual(locations.Regions, wantRegions) {
		t.Errorf("expected regions %v, got %v", wantRegions, locations.Regions)
	}

	wantCities := []string{"Blue Ridge", "Dahlonega", "Cleveland"}
	if !reflect.DeepEqual(locations.Cities, wantCities) {
		t.Errorf("expected cities %v, got %v", wantCities, locations.Cities)
	}

	wantDescription := "THE NATIONAL WEATHER SERVICE HAS ISSUED A SEVERE THUNDERSTORM WATCH."
	if description != wantDescription {
		t.Errorf("expected description %q, got %q", wantDescription, description)
	}
}

func TestParseLocations_CountyNamesEndingInIN(t *testing.T) {
	description := `IN TEXAS THIS WATCH INCLUDES 3 COUNTIES

IN SOUTH CENTRAL TEXAS

FANNIN                LUMPKIN               MOUNTAIN
`

	locations, _, err := ParseLocations(description)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if locations == nil {
		t.Fatal("expected locations, got nil")
	}

	want := []Region{
		{Area: "South Central Texas", Counties: []string{"Fannin", "Lumpkin", "Mountain"}},
	}
	if !reflect.DeepEqual(locations.Regions, want) {
		t.Errorf("expected regions %v, got %v", want, locations.Regions)
	}
}

func TestParseLocations_RepeatedCountyHeading(t *testing.T) {
	description := `IN GEORGIA THIS WATCH INCLUDES 3 COUNTIES

IN NORTH CENTRAL GEORGIA

FANNIN                LUMPKIN               UNION

IN ALABAMA THIS WATCH INCLUDES 2 COUNTIES

IN NORTHEAST ALABAMA

DEKALB                JACKSON
`

	locations, _, err := ParseLocations(description)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if locations == nil {
		t.Fatal("expected locations, got nil")
	}

	want := []Region{
		{Area: "North Central Georgia", Counties: []string{"Fannin", "Lumpkin", "Union"}},
		{Area: "Northeast Alabama", Counties: []string{"Dekalb", "Jackson"}},
	}
	if !reflect.DeepEqual(locations.Regions, want) {
		t.Errorf("expected regions %v, got %v", want, locations.Regions)
	}
}

func TestParseLocations_NoBlock(t *testing.T) {
	description := "A severe thunderstorm was located near Blue Ridge."

	locations, got, err := ParseLocations(description)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if locations != nil {
		t.Errorf("expected nil locations, got %v", locations)
	}
	if got != description {
		t.Errorf("expected the description unchanged, got %q", got)
	}
}

func TestParagraphSquash(t *testing.T) {
	for _, tt := range []struct {
		name string
		in   string
		want string
	}{
		{"wrapped line", "line one\nline two", "line one line two"},
		{"paragraph break", "para one\n\npara two", "para one\n\npara two"},
		{"consecutive wrapped lines", "a\nb\nc", "a b\nc"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := paragraphSquash(tt.in); got != tt.want {
				t.Errorf("expected %q, got %q", tt.want, got)
			}
		})
	}
}

func TestTitleCase(t *testing.T) {
	for _, tt := range []struct {
		in   string
		want string
	}{
		{"NORTH CENTRAL GEORGIA", "North Central Georgia"},
		{"DE KALB", "De Kalb"},
		{"ST. LOUIS", "St. Louis"},
		{"O'BRIEN", "O'brien"},
	} {
		t.Run(tt.in, func(t *testing.T) {
			if got := titleCase(tt.in); got != tt.want {
				t.Errorf("expected %q, got %q", tt.want, got)
			}
		})
	}
}

func TestExtractURLs(t *testing.T) {
	for _, tt := range []struct {
		name string
		in   string
		want []urlMatch
	}{
		{
			"weather.gov is internal",
			"See https://www.weather.gov/safety/flood for more.",
			[]urlMatch{{
				Text: "https://www.weather.gov/safety/flood",
				Node: linkNode{Type: "link", URL: "https://www.weather.gov/safety/flood", External: false},
			}},
		},
		{
			"another .gov is external",
			"See https://www.ready.gov/floods.",
			[]urlMatch{{
				Text: "https://www.ready.gov/floods",
				Node: linkNode{Type: "link", URL: "https://www.ready.gov/floods", External: true},
			}},
		},
		{
			"a bare origin gets a trailing slash",
			"Visit https://weather.gov",
			[]urlMatch{{
				Text: "https://weather.gov",
				Node: linkNode{Type: "link", URL: "https://weather.gov/", External: false},
			}},
		},
		{"a non-.gov host is dropped", "See https://example.com/floods.", nil},
		{"embedded credentials are dropped", "See https://user:pass@www.weather.gov/floods.", nil},
		{"no links at all", "Take shelter now.", nil},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := extractURLs(tt.in)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("expected %v, got %v", tt.want, got)
			}
		})
	}
}

func TestParagraphNodesFor_NormalizedURLNotInText(t *testing.T) {
	nodes, err := paragraphNodesFor("Visit https://weather.gov")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := `[{"type":"text","content":"Visit "},{"type":"link","url":"https://weather.gov/","external":false}]`
	if got := marshalNodes(t, nodes); got != want {
		t.Errorf("expected %s, got %s", want, got)
	}
}

func TestParseDescription(t *testing.T) {
	description := `...SEVERE THUNDERSTORM WARNING IN EFFECT...

* WHAT...Ping pong ball size hail.

* WHERE...Fannin County.

For more information see https://www.weather.gov/safety/thunderstorm and stay alert.`

	nodes, err := ParseDescription(description)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := `[` +
		`{"type":"paragraph","nodes":[{"type":"text","content":"SEVERE THUNDERSTORM WARNING IN EFFECT"}]},` +
		`{"type":"heading","text":"what"},` +
		`{"type":"paragraph","nodes":[{"type":"text","content":"Ping pong ball size hail."}]},` +
		`{"type":"heading","text":"where"},` +
		`{"type":"paragraph","nodes":[{"type":"text","content":"Fannin County."}]},` +
		`{"type":"paragraph","nodes":[` +
		`{"type":"text","content":"For more information see "},` +
		`{"type":"link","url":"https://www.weather.gov/safety/thunderstorm","external":false},` +
		`{"type":"text","content":" and stay alert."}` +
		`]}]`
	if got := marshalNodes(t, nodes); got != want {
		t.Errorf("expected %s, got %s", want, got)
	}
}

func TestParseDescription_Empty(t *testing.T) {
	nodes, err := ParseDescription("")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := `[{"type":"paragraph","nodes":[]}]`
	if got := marshalNodes(t, nodes); got != want {
		t.Errorf("expected %s, got %s", want, got)
	}
}

func TestSubstr(t *testing.T) {
	for _, tt := range []struct {
		name  string
		from  bool
		index int
		want  string
	}{
		{"from an offset inside the string", true, 2, "llo"},
		{"from an offset past the end", true, 99, ""},
		{"to an offset inside the string", false, 4, "hell"},
		{"to an offset past the end", false, 99, "hello"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := substrTo("hello", tt.index)
			if tt.from {
				got = substrFrom("hello", tt.index)
			}
			if got != tt.want {
				t.Errorf("expected %q, got %q", tt.want, got)
			}
		})
	}
}

func TestReplaceFirst(t *testing.T) {
	got := replaceFirst(andRe, "BLUE RIDGE AND DAHLONEGA AND CLEVELAND", "")
	want := "BLUE RIDGEDAHLONEGA AND CLEVELAND"
	if got != want {
		t.Errorf("expected %q, got %q", want, got)
	}
}
