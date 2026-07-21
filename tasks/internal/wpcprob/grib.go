package wpcprob

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"math"
	"os"
	"os/exec"
)

// wgrib2's -ieee output is a Fortran unformatted record: 4-byte length, data, 4-byte length
const ieeeRecordOverhead = 8

// Run wgrib2 on a grib2 file and read its "-ieee" binary dump into a flat value grid
func DecodeGrid(wgrib2Bin, gribPath string) ([]float64, error) {
	outPath := gribPath + ".ieee"
	defer os.Remove(outPath)

	cmd := exec.Command(wgrib2Bin, gribPath, "-ieee", outPath)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("wgrib2 -ieee %s: %w: %s", gribPath, err, stderr.String())
	}

	data, err := os.ReadFile(outPath)
	if err != nil {
		return nil, fmt.Errorf("reading wgrib2 -ieee output for %s: %w", gribPath, err)
	}

	values, err := parseGrid(data)
	if err != nil {
		return nil, fmt.Errorf("parsing -ieee output for %s: %w", gribPath, err)
	}
	return values, nil
}

// Validate and decode a wgrib2 "-ieee" record into a flat float64 grid
func parseGrid(data []byte) ([]float64, error) {
	wantLen := gridNX*gridNY*4 + ieeeRecordOverhead
	if len(data) != wantLen {
		return nil, fmt.Errorf("unexpected output size %d, expected %d (grid %dx%d)", len(data), wantLen, gridNX, gridNY)
	}
	recordLen := binary.BigEndian.Uint32(data[:4])
	if recordLen != uint32(gridNX*gridNY*4) {
		return nil, fmt.Errorf("unexpected record length %d, expected %d", recordLen, gridNX*gridNY*4)
	}

	values := make([]float64, gridNX*gridNY)
	for i := range values {
		bits := binary.BigEndian.Uint32(data[4+i*4:])
		values[i] = float64(math.Float32frombits(bits))
	}

	return values, nil
}

// Look up the value at a 1-based col/row, treating out-of-bounds or undefined cells as missing
func ValueAt(grid []float64, col, row int) (float64, bool) {
	if col < 1 || col > gridNX || row < 1 || row > gridNY {
		return 0, false
	}
	v := grid[(row-1)*gridNX+(col-1)]
	if v == gribUndefined {
		return 0, false
	}
	return v, true
}

// Decode each band's grib2 file and fill in the matrix with values at the gridpoints
func DecodeBands(wgrib2Bin, destDir, cycle, fhour string, bands []Band, gridpoints []Gridpoint, matrix *ValueMatrix) error {
	varIndex := make(map[string]int, len(matrix.Variables))
	for i, v := range matrix.Variables {
		varIndex[v] = i
	}

	for _, b := range bands {
		path := destDir + "/" + bandFilename(b, cycle, fhour)
		grid, err := DecodeGrid(wgrib2Bin, path)
		if err != nil {
			return fmt.Errorf("decoding %s: %w", b.FileFragment, err)
		}
		varIdx := varIndex[b.Variable]
		for pointIdx, gp := range gridpoints {
			raw, ok := ValueAt(grid, gp.Col, gp.Row)
			if !ok {
				continue
			}
			v := b.Kind.convert(raw)
			row := &matrix.Rows[pointIdx][varIdx]
			switch b.Kind {
			case KindAccumulationInches:
				row.Accumulation = &v
			case KindPercentileInches:
				if row.Percentiles == nil {
					row.Percentiles = make(map[string]float64)
				}
				row.Percentiles[b.Key] = v
			case KindProbabilityPercent:
				if row.Probabilities == nil {
					row.Probabilities = make(map[string]float64)
				}
				row.Probabilities[b.Key] = v
			}
		}
	}
	return nil
}
