package wpcprob

import "testing"

// dataColumn should suffix the variable name with _data
func TestDataColumn(t *testing.T) {
	got := dataColumn("rain")
	want := "rain_data"
	if got != want {
		t.Errorf("expected %v, got %v", want, got)
	}
}
