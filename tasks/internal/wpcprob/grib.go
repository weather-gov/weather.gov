package wpcprob

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"log/slog"
	"math"
	"os"
	"os/exec"
	"path/filepath"
)

// wgrib2's -ieee output is a Fortran unformatted record: 4-byte length, data, 4-byte length
const ieeeRecordOverhead = 8

// Reused across all 156 decodes, which allocated fresh would churn 3.7 GB of garbage
type decodeBuffers struct {
	raw  []byte
	grid []float32
}

func newDecodeBuffers() *decodeBuffers {
	return &decodeBuffers{
		raw:  make([]byte, gridNX*gridNY*4+ieeeRecordOverhead),
		grid: make([]float32, gridNX*gridNY),
	}
}

// The returned slice is bufs.grid, so the next decode overwrites it
func DecodeGrid(ctx context.Context, wgrib2Bin, gribPath string, bufs *decodeBuffers) ([]float32, error) {
	outPath := gribPath + ".ieee"
	defer os.Remove(outPath)

	// Bounded by ctx so a wedged wgrib2 cannot run past the whole run's deadline
	cmd := exec.CommandContext(ctx, wgrib2Bin, gribPath, "-ieee", outPath)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("wgrib2 -ieee %s: %w: %s", gribPath, err, stderr.String())
	}

	data, err := readInto(outPath, bufs.raw)
	if err != nil {
		return nil, fmt.Errorf("reading wgrib2 -ieee output for %s: %w", gribPath, err)
	}

	if err := parseGrid(data, bufs.grid); err != nil {
		return nil, fmt.Errorf("parsing -ieee output for %s: %w", gribPath, err)
	}
	return bufs.grid, nil
}

func readInto(path string, buf []byte) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		return nil, err
	}
	// A short file is a truncated dump, a long one is a grid that isn't WPC's
	if info.Size() != int64(len(buf)) {
		return nil, fmt.Errorf("unexpected output size %d, expected %d (grid %dx%d)", info.Size(), len(buf), gridNX, gridNY)
	}
	if _, err := io.ReadFull(f, buf); err != nil {
		return nil, err
	}
	return buf, nil
}

func parseGrid(data []byte, grid []float32) error {
	recordLen := binary.BigEndian.Uint32(data[:4])
	if recordLen != uint32(gridNX*gridNY*4) {
		return fmt.Errorf("unexpected record length %d, expected %d", recordLen, gridNX*gridNY*4)
	}

	for i := range grid {
		grid[i] = math.Float32frombits(binary.BigEndian.Uint32(data[4+i*4:]))
	}
	return nil
}

// Look up a cell by its flat offset, treating out-of-bounds or undefined cells as missing
func valueAtCell(grid []float32, cell int32) (float32, bool) {
	if cell < 0 || int(cell) >= len(grid) {
		return 0, false
	}
	v := grid[cell]
	// The percentile grids fill their easternmost column with -9999 instead of flagging it undefined
	if v == gribUndefined || v < 0 {
		return 0, false
	}
	return v, true
}

// Decode every (variable, period, band), one grid live at a time, and store each variable once
func DecodeAndStoreVariables(ctx context.Context, logger *slog.Logger, wgrib2Bin, destDir, cycle string, fhours []string, bands []Band, gridpoints []Gridpoint, store func(string, *VariableMatrix) error) error {
	buf := newMatrixBuffer(bands, len(fhours), len(gridpoints))
	bufs := newDecodeBuffers()
	decoded := 0

	for _, group := range groupByVariable(bands) {
		matrix := matrixFor(buf, group, len(fhours), len(gridpoints))
		for periodIdx, fhour := range fhours {
			for bandIdx, b := range group {
				path := filepath.Join(destDir, bandFilename(b, cycle, fhour))
				grid, err := DecodeGrid(ctx, wgrib2Bin, path, bufs)
				// Disk falls back as the run proceeds rather than holding all 156 files at once
				os.Remove(path)
				if err != nil {
					// A band WPC never published or served short leaves NaN, which reads back as no value
					logger.Warn("skipping band", "band", b.FileFragment, "fhour", fhour, "err", err)
					continue
				}
				decoded++
				for pointIdx, gp := range gridpoints {
					if raw, ok := valueAtCell(grid, gp.Cell); ok {
						matrix.set(pointIdx, periodIdx, bandIdx, b.convert(raw))
					}
				}
			}
		}
		if err := store(group[0].Variable, matrix); err != nil {
			return fmt.Errorf("storing %s: %w", group[0].Variable, err)
		}
	}

	// Nothing decoded means an outage, and swapping would blank the live table
	if decoded == 0 {
		return fmt.Errorf("no bands decoded for cycle %s", cycle)
	}
	return nil
}
