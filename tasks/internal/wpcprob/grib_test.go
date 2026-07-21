package wpcprob

import (
	"encoding/binary"
	"math"
	"testing"
)

// Build a wgrib2 "-ieee" record: 4-byte length, big-endian float32 values, 4-byte length
func buildIEEERecord(values []float32) []byte {
	data := make([]byte, ieeeRecordOverhead+len(values)*4)
	binary.BigEndian.PutUint32(data[:4], uint32(len(values)*4))
	for i, v := range values {
		binary.BigEndian.PutUint32(data[4+i*4:], math.Float32bits(v))
	}
	binary.BigEndian.PutUint32(data[len(data)-4:], uint32(len(values)*4))
	return data
}

// ValueAt should return the value and true for an in-bounds, defined cell
func TestValueAt_InBounds(t *testing.T) {
	grid := make([]float64, gridNX*gridNY)
	grid[0] = 42.5        // col 1, row 1
	grid[gridNX+1] = 7.25 // col 2, row 2

	if v, ok := ValueAt(grid, 1, 1); !ok || v != 42.5 {
		t.Errorf("expected (42.5, true), got (%v, %v)", v, ok)
	}
	if v, ok := ValueAt(grid, 2, 2); !ok || v != 7.25 {
		t.Errorf("expected (7.25, true), got (%v, %v)", v, ok)
	}
}

// ValueAt should reject columns/rows outside the grid
func TestValueAt_OutOfBounds(t *testing.T) {
	grid := make([]float64, gridNX*gridNY)

	cases := []struct{ col, row int }{
		{0, 1}, {1, 0}, {gridNX + 1, 1}, {1, gridNY + 1},
	}
	for _, c := range cases {
		if _, ok := ValueAt(grid, c.col, c.row); ok {
			t.Errorf("expected out-of-bounds (%d,%d) to be rejected", c.col, c.row)
		}
	}
}

// ValueAt should treat grib2's undefined sentinel as missing
func TestValueAt_Undefined(t *testing.T) {
	grid := make([]float64, gridNX*gridNY)
	grid[0] = gribUndefined

	if _, ok := ValueAt(grid, 1, 1); ok {
		t.Error("expected undefined cell to be reported as missing")
	}
}

// parseGrid should decode a record into the grid's flat values
func TestParseGrid(t *testing.T) {
	want := make([]float32, gridNX*gridNY)
	want[0] = 42.5
	want[len(want)-1] = -7.25

	got, err := parseGrid(buildIEEERecord(want))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got[0] != 42.5 || got[len(got)-1] != -7.25 {
		t.Errorf("expected (42.5, -7.25) at the ends, got (%v, %v)", got[0], got[len(got)-1])
	}
}

// parseGrid should reject a record whose overall length doesn't match the expected grid size
func TestParseGrid_WrongLength(t *testing.T) {
	data := buildIEEERecord(make([]float32, gridNX*gridNY-1))
	if _, err := parseGrid(data); err == nil {
		t.Error("expected an error for a short record")
	}
}

// parseGrid should reject a record whose length-prefixed header doesn't match its data
func TestParseGrid_WrongRecordLength(t *testing.T) {
	data := buildIEEERecord(make([]float32, gridNX*gridNY))
	binary.BigEndian.PutUint32(data[:4], 0)
	if _, err := parseGrid(data); err == nil {
		t.Error("expected an error for a corrupt record length header")
	}
}
