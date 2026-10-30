package alerts

import (
	"reflect"
	"testing"
)

func aqaFeature(id, sent string, zones ...string) SourceFeature {
	feature := landFeature()
	feature.Props.ID = id
	feature.Props.Event = "Air Quality Alert"
	feature.Props.Sent = sent
	feature.Props.Geocode.UGC = zones
	return *feature
}

func TestSupersededAirQuality(t *testing.T) {
	heat := aqaFeature("heat", "2026-10-15T11:00:00-04:00", "NYZ005")
	heat.Props.Event = "Heat Advisory"

	cases := []struct {
		name     string
		features []SourceFeature
		want     map[int][]string
	}{
		{
			name: "newer wins",
			features: []SourceFeature{
				aqaFeature("old", "2026-10-15T12:00:00-04:00", "NYZ005"),
				aqaFeature("new", "2026-10-15T13:00:00-04:00", "NYZ005"),
			},
			want: map[int][]string{0: {"new"}},
		},
		{
			name: "covered by two newer alerts",
			features: []SourceFeature{
				aqaFeature("wide", "2026-10-15T12:00:00-04:00", "NYZ005", "NYZ010"),
				aqaFeature("north", "2026-10-15T13:00:00-04:00", "NYZ005"),
				aqaFeature("south", "2026-10-15T13:00:00-04:00", "NYZ010"),
			},
			want: map[int][]string{0: {"north", "south"}},
		},
		{
			name: "still newest in one zone",
			features: []SourceFeature{
				aqaFeature("wide", "2026-10-15T12:00:00-04:00", "NYZ005", "NYZ010"),
				aqaFeature("narrow", "2026-10-15T13:00:00-04:00", "NYZ005"),
			},
			want: map[int][]string{},
		},
		{
			name: "no zones",
			features: []SourceFeature{
				aqaFeature("nozones", "2026-10-15T12:00:00-04:00"),
				aqaFeature("new", "2026-10-15T13:00:00-04:00", "NYZ005"),
			},
			want: map[int][]string{},
		},
		{
			name: "other kinds untouched",
			features: []SourceFeature{
				heat,
				aqaFeature("new", "2026-10-15T13:00:00-04:00", "NYZ005"),
			},
			want: map[int][]string{},
		},
		{
			name: "tie goes to the first in the feed",
			features: []SourceFeature{
				aqaFeature("first", "2026-10-15T12:00:00-04:00", "NYZ005"),
				aqaFeature("second", "2026-10-15T12:00:00-04:00", "NYZ005"),
			},
			want: map[int][]string{1: {"first"}},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _ := supersededAirQuality(tc.features)
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("expected %v, got %v", tc.want, got)
			}
		})
	}
}
