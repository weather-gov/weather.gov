package wpcprob

import "testing"

// GridIndex should map the grid's own origin lat/lon back to (col 1, row 1)
func TestGridIndex_Origin(t *testing.T) {
	proj := newWPCProjector()

	col, row := proj.GridIndex(gridLat1Deg, gridLon1Deg)
	if col != 1 || row != 1 {
		t.Errorf("expected (1,1), got (%d,%d)", col, row)
	}
}

// GridIndex should place Miami east and south of Denver, both within the grid's bounds
func TestGridIndex_RelativePosition(t *testing.T) {
	proj := newWPCProjector()

	denverCol, denverRow := proj.GridIndex(39.7392, -104.9903)
	miamiCol, miamiRow := proj.GridIndex(25.7617, -80.1918)

	for _, p := range []struct {
		name     string
		col, row int
	}{
		{"Denver", denverCol, denverRow},
		{"Miami", miamiCol, miamiRow},
	} {
		if p.col < 1 || p.col > gridNX || p.row < 1 || p.row > gridNY {
			t.Errorf("%s: (%d,%d) is outside the grid", p.name, p.col, p.row)
		}
	}

	if miamiCol <= denverCol {
		t.Errorf("expected Miami's column (%d) to be east of Denver's (%d)", miamiCol, denverCol)
	}
	if miamiRow >= denverRow {
		t.Errorf("expected Miami's row (%d) to be south of Denver's (%d)", miamiRow, denverRow)
	}
}

// Pins GridIndex to known-good values so a future wgs84 upgrade that changes the projection math gets caught.
func TestGridIndex_KnownPoints(t *testing.T) {
	proj := newWPCProjector()

	for _, tc := range []struct {
		name     string
		lat, lon float64
		col, row int
	}{
		{"Culver City", 34.0211, -118.3965, 233, 576},
		{"Boulder", 40.0150, -105.2705, 732, 784},
		{"College Park", 38.9887, -76.9388, 1721, 766},
	} {
		col, row := proj.GridIndex(tc.lat, tc.lon)
		if col != tc.col || row != tc.row {
			t.Errorf("%s: expected (%d,%d), got (%d,%d)", tc.name, tc.col, tc.row, col, row)
		}
	}
}
