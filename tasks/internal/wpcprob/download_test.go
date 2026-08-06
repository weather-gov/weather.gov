package wpcprob

import "testing"

// selectFHour should pick the window already underway rather than the next one out
func TestSelectFHour(t *testing.T) {
	tests := []struct {
		name   string
		fhours []string
		want   string
	}{
		// Cycle hours that land on a 6-hourly boundary offer a window starting exactly at the cycle
		{"cycle on a boundary", []string{"024", "030", "036", "042"}, "024"},
		// Off-boundary cycles offer the same window, shortened by however far into it the cycle sits
		{"cycle an hour past a boundary", []string{"023", "029", "035", "041"}, "023"},
		{"cycle five hours past a boundary", []string{"019", "025", "031", "037"}, "019"},
		// Shorter windows began well before the cycle, so they cover mostly elapsed time
		{"skips windows that mostly elapsed", []string{"005", "011", "017", "023", "029"}, "023"},
		// Nothing has begun yet, so the soonest window ahead is the closest available
		{"falls forward when nothing is underway", []string{"029", "035", "041"}, "029"},
		{"unsorted listing", []string{"035", "023", "041", "029"}, "023"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := selectFHour(tt.fhours)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("expected %s, got %s", tt.want, got)
			}
		})
	}
}

// selectFHour should error rather than return an empty forecast hour
func TestSelectFHour_Empty(t *testing.T) {
	if _, err := selectFHour(nil); err == nil {
		t.Error("expected an error for an empty listing")
	}
}

// selectFHour should error on a forecast hour it can't parse
func TestSelectFHour_Unparseable(t *testing.T) {
	if _, err := selectFHour([]string{"abc"}); err == nil {
		t.Error("expected an error for an unparseable forecast hour")
	}
}
