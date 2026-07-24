package wpcprob

import (
	"fmt"
	"math"
	"strings"
)

type Band struct {
	FileFragment string
	Variable     string
	Kind         BandKind
	Key          string // dict key within Percentiles/Probabilities; unused for KindAccumulationInches
}

type BandKind int

const (
	KindAccumulationInches BandKind = iota
	KindPercentileInches
	KindProbabilityPercent
)

// Convert a raw grib2 value into the unit it's stored in
func (k BandKind) convert(raw float32) float32 {
	switch k {
	case KindAccumulationInches, KindPercentileInches:
		return raw / 25.4
	case KindProbabilityPercent:
		return raw * 100
	default:
		panic("unhandled BandKind")
	}
}

// Parameters of WPC's CONUS grid: a Lambert Conformal Conic projection
const (
	gridNX          = 2145        // number of columns in the grid
	gridNY          = 1377        // number of rows in the grid
	gribUndefined   = 9.999e20    // sentinel value grib2 uses for a missing cell
	wpcEarthRadiusM = 6371200     // sphere radius LCC is computed against, in meters
	wpcStdParallel  = 25          // latitude where the cone touches the earth, in degrees
	wpcCentralMerid = -95         // longitude the grid is centered on, in degrees
	gridLat1Deg     = 20.191999   // latitude of grid cell (col 1, row 1)
	gridLon1Deg     = -121.554001 // longitude of grid cell (col 1, row 1)
	gridDxM         = 2539.703    // cell spacing along a column, in meters
	gridDyM         = 2539.703    // cell spacing along a row, in meters
)

type wpcVariable struct {
	Name       string
	Ptype      string
	Thresholds []string
}

var wpcVariables = []wpcVariable{
	{
		Name:       "rain",
		Ptype:      "p",
		Thresholds: []string{"0p01", "0p10", "0p25", "0p50", "1p00", "2p00", "3p00", "4p00", "6p00", "8p00", "12p0"},
	},
	{
		Name:       "snow",
		Ptype:      "w",
		Thresholds: []string{"0p10", "1p00", "2p00", "4p00", "6p00", "8p00", "12p0", "18p0"},
	},
	{
		Name:       "freezing_rain",
		Ptype:      "z",
		Thresholds: []string{"0p01", "0p10", "0p25", "0p50", "0p75", "1p00", "1p25", "1p50", "2p00"},
	},
}

var percentiles = []string{"01", "05", "10", "25", "50", "75", "90", "95", "99"}

// Build the full list of bands (accumulation, percentile, probability) across all variables
func BandList() []Band {
	var bands []Band
	for _, v := range wpcVariables {
		bands = append(bands, Band{
			FileFragment: v.Ptype + "24i",
			Variable:     v.Name,
			Kind:         KindAccumulationInches,
		})
		for _, pct := range percentiles {
			bands = append(bands, Band{
				FileFragment: "p" + v.Ptype + "24ip0p" + pct,
				Variable:     v.Name,
				Kind:         KindPercentileInches,
				Key:          trimLeadingZero(pct),
			})
		}
		for _, th := range v.Thresholds {
			bands = append(bands, Band{
				FileFragment: "p" + v.Ptype + "24ige" + th,
				Variable:     v.Name,
				Kind:         KindProbabilityPercent,
				Key:          thresholdKey(th),
			})
		}
	}
	return bands
}

// Strip a leading "0" from a percentile string (e.g. "05" -> "5")
func trimLeadingZero(pct string) string {
	if pct[0] == '0' {
		return pct[1:]
	}
	return pct
}

// Convert a WPC threshold fragment like "0p01" into a JSON key like "0.01"
func thresholdKey(th string) string {
	return strings.Replace(th, "p", ".", 1)
}

// Build the grib2 filename WPC publishes for a band at a given cycle/fhour
func bandFilename(b Band, cycle, fhour string) string {
	return fmt.Sprintf("ndfd_co_%s_%sf%s.grib2", b.FileFragment, cycle, fhour)
}

type Gridpoint struct {
	WFO      string
	X, Y     int
	Col, Row int
}

// VariableRow holds one variable's decoded values, in float32 to match wgrib2's -ieee single-precision output
// its json tags double as the jsonb column's keys.
type VariableRow struct {
	Accumulation  *float32           `json:"accumulation,omitempty"`
	Percentiles   map[string]float32 `json:"percentiles,omitempty"`
	Probabilities map[string]float32 `json:"probabilities,omitempty"`
}

// IsEmpty reports whether nothing was decoded for this variable at this gridpoint
func (r VariableRow) IsEmpty() bool {
	return r.Accumulation == nil && len(r.Percentiles) == 0 && len(r.Probabilities) == 0
}

// missingValue marks a (gridpoint, band) never decoded; real values are always finite so NaN can't collide
var missingValue = float32(math.NaN())

// ValueMatrix holds one decoded value per (gridpoint, band) as a flat float32 array
// avoiding the per-point map overhead a Go map[string]float64 costs at 1.8M points x 58 bands
type ValueMatrix struct {
	Bands     []Band
	Variables []string
	values    []float32 // values[pointIdx*len(Bands)+bandIdx]
}

// Allocate a matrix for n gridpoints across the given bands, pre-filled with missingValue
func NewValueMatrix(bands []Band, n int) *ValueMatrix {
	values := make([]float32, n*len(bands))
	for i := range values {
		values[i] = missingValue
	}
	return &ValueMatrix{Bands: bands, Variables: variableNames(bands), values: values}
}

// Set records a decoded value for the given gridpoint/band
func (m *ValueMatrix) Set(pointIdx, bandIdx int, v float32) {
	m.values[pointIdx*len(m.Bands)+bandIdx] = v
}

// Row reconstructs one gridpoint's VariableRow slice, transiently, from the flat matrix
func (m *ValueMatrix) Row(pointIdx int, varIndex map[string]int) []VariableRow {
	rows := make([]VariableRow, len(m.Variables))
	base := pointIdx * len(m.Bands)
	for bandIdx, b := range m.Bands {
		v := m.values[base+bandIdx]
		if math.IsNaN(float64(v)) {
			continue
		}
		row := &rows[varIndex[b.Variable]]
		switch b.Kind {
		case KindAccumulationInches:
			row.Accumulation = &v
		case KindPercentileInches:
			if row.Percentiles == nil {
				row.Percentiles = make(map[string]float32)
			}
			row.Percentiles[b.Key] = v
		case KindProbabilityPercent:
			if row.Probabilities == nil {
				row.Probabilities = make(map[string]float32)
			}
			row.Probabilities[b.Key] = v
		}
	}
	return rows
}

// VarIndex maps each variable name to its position in Variables
func (m *ValueMatrix) VarIndex() map[string]int {
	idx := make(map[string]int, len(m.Variables))
	for i, v := range m.Variables {
		idx[v] = i
	}
	return idx
}

// Pull out each band's variable name, deduplicated and in first-seen order
func variableNames(bands []Band) []string {
	var names []string
	seen := map[string]bool{}
	for _, b := range bands {
		if !seen[b.Variable] {
			seen[b.Variable] = true
			names = append(names, b.Variable)
		}
	}
	return names
}
