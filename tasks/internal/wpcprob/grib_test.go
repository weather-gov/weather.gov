package wpcprob

import (
	"encoding/binary"
	"math"
	"os"
	"path/filepath"
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

// valueAtCell should return the value and true for an in-bounds, defined cell
func TestValueAtCell_InBounds(t *testing.T) {
	grid := make([]float32, gridNX*gridNY)
	grid[0] = 42.5
	grid[gridNX+1] = 7.25

	if v, ok := valueAtCell(grid, 0); !ok || v != 42.5 {
		t.Errorf("expected (42.5, true), got (%v, %v)", v, ok)
	}
	if v, ok := valueAtCell(grid, gridNX+1); !ok || v != 7.25 {
		t.Errorf("expected (7.25, true), got (%v, %v)", v, ok)
	}
}

// valueAtCell should reject offsets outside the grid
func TestValueAtCell_OutOfBounds(t *testing.T) {
	grid := make([]float32, gridNX*gridNY)

	for _, cell := range []int32{-1, gridNX * gridNY} {
		if _, ok := valueAtCell(grid, cell); ok {
			t.Errorf("expected out-of-bounds cell %d to be rejected", cell)
		}
	}
}

// valueAtCell should treat grib2's undefined sentinel and the negative easternmost column as missing
func TestValueAtCell_Undefined(t *testing.T) {
	grid := make([]float32, gridNX*gridNY)
	grid[0] = gribUndefined
	grid[1] = -9999

	for _, cell := range []int32{0, 1} {
		if _, ok := valueAtCell(grid, cell); ok {
			t.Errorf("expected cell %d to be reported as missing", cell)
		}
	}
}

// parseGrid should decode a record into the grid's flat values
func TestParseGrid(t *testing.T) {
	want := make([]float32, gridNX*gridNY)
	want[0] = 42.5
	want[len(want)-1] = -7.25

	got := make([]float32, gridNX*gridNY)
	if err := parseGrid(buildIEEERecord(want), got); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got[0] != 42.5 || got[len(got)-1] != -7.25 {
		t.Errorf("expected (42.5, -7.25) at the ends, got (%v, %v)", got[0], got[len(got)-1])
	}
}

// parseGrid should reject a record whose length-prefixed header doesn't match its data
func TestParseGrid_WrongRecordLength(t *testing.T) {
	data := buildIEEERecord(make([]float32, gridNX*gridNY))
	binary.BigEndian.PutUint32(data[:4], 0)

	if err := parseGrid(data, make([]float32, gridNX*gridNY)); err == nil {
		t.Error("expected an error for a corrupt record length header")
	}
}

// readInto should reject a dump that isn't exactly one full grid, which is what a truncated file looks like
func TestReadInto_WrongSize(t *testing.T) {
	bufs := newDecodeBuffers()
	dir := t.TempDir()

	for _, tc := range []struct {
		name string
		size int
	}{
		{"truncated", len(bufs.raw) - 4},
		{"overlong", len(bufs.raw) + 4},
	} {
		t.Run(tc.name, func(t *testing.T) {
			path := filepath.Join(dir, tc.name)
			if err := os.WriteFile(path, make([]byte, tc.size), 0o600); err != nil {
				t.Fatalf("writing fixture: %v", err)
			}
			if _, err := readInto(path, bufs.raw); err == nil {
				t.Errorf("expected an error for a %s dump", tc.name)
			}
		})
	}
}
