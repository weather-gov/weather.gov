package alerts

import (
	"encoding/json"
	"fmt"
	"reflect"
	"testing"
	"time"
)

var testNow = time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC)

func ptr[T any](value T) *T {
	return &value
}

func landFeature() *SourceFeature {
	return &SourceFeature{
		Geometry: json.RawMessage(`{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}`),
		Hash:     "hash-1",
		Props: SourceProperties{
			ID:          "urn:oid:2.49.0.1.840.0.abc.001.1",
			Event:       "Tornado Warning",
			SenderName:  "NWS Peachtree City GA",
			AreaDesc:    ptr("Fannin, GA; Union, GA"),
			Description: "A tornado warning is in effect.",
			Instruction: ptr("Take shelter now."),
			Sent:        "2024-01-15T13:45:30-05:00",
			Effective:   "2024-01-15T13:45:30-05:00",
			Expires:     "2124-01-15T14:45:30-05:00",
			Geocode: struct {
				SAME []string `json:"SAME"`
			}{SAME: []string{"013111", "013137", "013139"}},
		},
	}
}

func keyFromAlertJSON(t *testing.T, alertJSON []byte, key string) string {
	t.Helper()
	var decoded map[string]any
	if err := json.Unmarshal(alertJSON, &decoded); err != nil {
		t.Fatalf("could not decode the alert: %v", err)
	}
	value, ok := decoded[key].(string)
	if !ok {
		t.Fatalf("expected a string at %q, got %v", key, decoded[key])
	}
	return value
}

func TestParseTimestamp(t *testing.T) {
	for _, tt := range []struct {
		name  string
		in    string
		want  string
		dated bool
	}{
		{"offset is converted to UTC", "2024-01-15T13:45:30-05:00", "2024-01-15T18:45:30.000Z", true},
		{"milliseconds are kept", "2024-01-15T18:45:30.123Z", "2024-01-15T18:45:30.123Z", true},
		{"prose passes through", "later today", "later today", false},
		{"an unparseable date passes through", "2024-13-45T99:99:99Z", "2024-13-45T99:99:99Z", false},
		{"empty passes through", "", "", false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := parseTimestamp(tt.in)
			if got.text != tt.want || got.dated != tt.dated {
				t.Errorf("expected (%q, %t), got (%q, %t)", tt.want, tt.dated, got.text, got.dated)
			}
		})
	}
}

func TestMetadataFor(t *testing.T) {
	for _, tt := range []struct {
		name  string
		event string
		want  Metadata
	}{
		{"a known event", "Tornado Warning", EventToMetadata["tornado warning"]},
		{"case does not matter", "TORNADO WARNING", EventToMetadata["tornado warning"]},
		{"an unknown event", "Sharknado Warning", UnknownMetadata},
		{"an unknown evacuation", "Mandatory Evacuation Notice", EventToMetadata["evacuation immediate"]},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := metadataFor(tt.event); got != tt.want {
				t.Errorf("expected %v, got %v", tt.want, got)
			}
		})
	}
}

func TestLastThree(t *testing.T) {
	for _, tt := range []struct {
		in   string
		want string
	}{
		{"urn:oid:2.49.0.1.840.0.abc.001.1", "abc_001_1"},
		{"a.b", "a_b"},
		{"single", "single"},
	} {
		t.Run(tt.in, func(t *testing.T) {
			if got := lastThree(tt.in); got != tt.want {
				t.Errorf("expected %q, got %q", tt.want, got)
			}
		})
	}
}

func TestMarshalWithoutHTMLEscaping(t *testing.T) {
	encoded, err := marshalWithoutHTMLEscaping(map[string]string{"text": "wind & <hail>"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := `{"text":"wind & <hail>"}`
	if string(encoded) != want {
		t.Errorf("expected %s, got %s", want, encoded)
	}
}

func TestProcessAlert_Land(t *testing.T) {
	row, ok, err := processAlert(landFeature(), testNow, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok {
		t.Fatal("expected the alert to be stored")
	}

	want := `{"hash":"hash-1","id":"abc_001_1","event":"Tornado Warning",` +
		`"metadata":{"level":{"priority":0,"text":"warning"},"kind":"land","priority":1024},` +
		`"sender":"NWS Peachtree City GA",` +
		`"description":[{"type":"paragraph","nodes":[{"type":"text","content":"A tornado warning is in effect."}]}],` +
		`"instruction":"Take shelter now.","area":["Fannin, GA","Union, GA"],` +
		`"sent":"2024-01-15T18:45:30.000Z","effective":"2024-01-15T18:45:30.000Z",` +
		`"onset":"2024-01-15T18:45:30.000Z","expires":"2124-01-15T19:45:30.000Z",` +
		`"ends":null,"finish":"2124-01-15T19:45:30.000Z"}`
	if string(row.AlertJSON) != want {
		t.Errorf("expected %s, got %s", want, row.AlertJSON)
	}

	if row.AlertKind != KindLand {
		t.Errorf("expected the land kind, got %q", row.AlertKind)
	}
	if row.Geometry == nil || string(row.Geometry.Shape) != string(landFeature().Geometry) {
		t.Errorf("expected the feature's own geometry, got %v", row.Geometry)
	}
}

func TestProcessAlert_CountiesAndStates(t *testing.T) {
	row, _, err := processAlert(landFeature(), testNow, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if string(row.Counties) != `["13111","13137","13139"]` {
		t.Errorf("expected the SAME codes without their leading zero, got %s", row.Counties)
	}
	if string(row.States) != `["13","13","13"]` {
		t.Errorf("expected undeduplicated states, got %s", row.States)
	}
}

func TestProcessAlert_UnstoredKindTombstone(t *testing.T) {
	feature := landFeature()
	feature.Props.Event = "Blue Alert"

	row, ok, err := processAlert(feature, testNow, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok {
		t.Fatal("expected the alert to be stored")
	}

	want := `{"metadata":{"level":{"priority":2048,"text":"other"},"kind":"other","priority":112640}}`
	if string(row.AlertJSON) != want {
		t.Errorf("expected %s, got %s", want, row.AlertJSON)
	}
	if string(row.Counties) != "[]" || string(row.States) != "[]" {
		t.Errorf("expected empty counties and states, got %s and %s", row.Counties, row.States)
	}
	if row.Geometry != nil {
		t.Errorf("expected no geometry, got %v", row.Geometry)
	}
}

func TestProcessAlert_MarineTombstone(t *testing.T) {
	feature := landFeature()
	feature.Props.Event = "Small Craft Advisory"

	row, ok, err := processAlert(feature, testNow, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !ok {
		t.Fatal("expected the alert to be stored")
	}

	if row.AlertKind != KindMarine {
		t.Errorf("expected a marine alert, got %q", row.AlertKind)
	}
	if row.Geometry != nil {
		t.Errorf("expected no geometry, got %v", row.Geometry)
	}
}

func TestProcessAlert_Expired(t *testing.T) {
	feature := landFeature()
	feature.Props.Expires = "2024-01-15T14:45:30-05:00"

	_, ok, err := processAlert(feature, testNow, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Error("expected an expired alert to be skipped")
	}
}

func TestProcessAlert_Onset(t *testing.T) {
	for _, tt := range []struct {
		name  string
		onset *string
		want  string
	}{
		{"missing onset falls back to effective", nil, "2024-01-15T18:45:30.000Z"},
		{"onset is used when set", ptr("2024-01-16T09:00:00-05:00"), "2024-01-16T14:00:00.000Z"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			feature := landFeature()
			feature.Props.Onset = tt.onset

			row, _, err := processAlert(feature, testNow, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := keyFromAlertJSON(t, row.AlertJSON, "onset"); got != tt.want {
				t.Errorf("expected onset %q, got %q", tt.want, got)
			}
		})
	}
}

func TestProcessAlert_Finish(t *testing.T) {
	for _, tt := range []struct {
		name string
		ends *string
		want string
	}{
		{"ends is used when set", ptr("2124-01-16T09:00:00-05:00"), "2124-01-16T14:00:00.000Z"},
		{"an empty ends falls back to expires", ptr(""), "2124-01-15T19:45:30.000Z"},
		{"a missing ends falls back to expires", nil, "2124-01-15T19:45:30.000Z"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			feature := landFeature()
			feature.Props.Ends = tt.ends

			row, _, err := processAlert(feature, testNow, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := keyFromAlertJSON(t, row.AlertJSON, "finish"); got != tt.want {
				t.Errorf("expected finish %q, got %q", tt.want, got)
			}
		})
	}
}

func TestProcessAlert_NoGeometry(t *testing.T) {
	feature := landFeature()
	feature.Geometry = nil
	feature.Props.Geocode.SAME = nil

	_, ok, err := processAlert(feature, testNow, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ok {
		t.Error("expected an alert with no geometry to be skipped")
	}
}

func TestZoneIDsFor_DedupesAndDropsCountyZones(t *testing.T) {
	features := []SourceFeature{
		{Props: SourceProperties{AffectedZones: []string{forecastZone, countyZone}}},
		{Props: SourceProperties{AffectedZones: []string{forecastZone}}},
	}

	if ids := zoneIDsFor(features); !reflect.DeepEqual(ids, []string{forecastZone}) {
		t.Errorf("expected one forecast zone, got %v", ids)
	}
}

func TestTransform_KeepsFeedOrder(t *testing.T) {
	features := make([]SourceFeature, 0, 30)
	wantHashes := make([]string, 0, 30)
	for i := range 30 {
		feature := *landFeature()
		feature.Hash = fmt.Sprintf("hash-%d", i)

		// Every third alert is marine, so it lands as a tombstone rather than dropping out
		if i%3 == 0 {
			feature.Props.Event = "Small Craft Advisory"
		}
		features = append(features, feature)
		wantHashes = append(wantHashes, feature.Hash)
	}

	rows := transform(features, testNow, nil)

	hashes := make([]string, 0, len(rows))
	for _, row := range rows {
		hashes = append(hashes, row.Hash)
	}
	if !reflect.DeepEqual(hashes, wantHashes) {
		t.Errorf("expected %v, got %v", wantHashes, hashes)
	}
}
