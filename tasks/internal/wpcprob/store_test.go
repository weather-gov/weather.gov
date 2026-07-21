package wpcprob

import (
	"reflect"
	"testing"
)

// columnNames should suffix each variable name with _data, in order
func TestColumnNames(t *testing.T) {
	got := columnNames([]string{"rain", "snow"})
	want := []string{"rain_data", "snow_data"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("expected %v, got %v", want, got)
	}
}

// columnNames should return an empty slice when there are no variables
func TestColumnNames_Empty(t *testing.T) {
	got := columnNames(nil)
	if len(got) != 0 {
		t.Errorf("expected empty slice, got %v", got)
	}
}
