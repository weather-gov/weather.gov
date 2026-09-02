package wpcprob

import (
	"fmt"
	"math"
	"strings"
)

// One grib2 file to download, plus how to read the numbers inside it
type Band struct {
	FileFragment string
	Variable     string
	Kind         BandKind
	Key          string // dict key within Percentiles/Probabilities; unused for KindAccumulationInches
	ToInches     float32
}

// What a band's numbers mean, which decides both the unit conversion and where they're stored
type BandKind int

const (
	KindAccumulationInches BandKind = iota
	KindPercentileInches
	KindProbabilityPercent
)

const (
	inchesPerMM    = 1.0 / 25.4
	inchesPerMetre = 39.370079
)

// Convert a raw grib2 value into the unit it's stored in
func (b Band) convert(raw float32) float32 {
	switch b.Kind {
	case KindAccumulationInches, KindPercentileInches:
		// Each variable's grib2 field carries its own unit, so the factor rides on the band
		return raw * b.ToInches
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

// One precipitation type, and the amounts WPC publishes exceedance probabilities for
type wpcVariable struct {
	Name       string
	Ptype      string
	ToInches   float32
	Thresholds []string
}

var wpcVariables = []wpcVariable{
	{
		Name:       "rain",
		Ptype:      "p",
		ToInches:   inchesPerMM, // APCP, kg/m^2
		Thresholds: []string{"0p01", "0p10", "0p25", "0p50", "1p00", "2p00", "3p00", "4p00", "6p00", "8p00", "12p0"},
	},
	{
		Name:       "snow",
		Ptype:      "w",
		ToInches:   inchesPerMetre, // ASNOW, metres
		Thresholds: []string{"0p10", "1p00", "2p00", "4p00", "6p00", "8p00", "12p0", "18p0"},
	},
	{
		Name:       "freezing_rain",
		Ptype:      "z",
		ToInches:   inchesPerMM, // FRZR, kg/m^2
		Thresholds: []string{"0p01", "0p10", "0p25", "0p50", "0p75", "1p00", "1p25", "1p50", "2p00"},
	},
}

var percentiles = []string{"05", "10", "25", "50", "75", "90", "95"}

// Build the full list of bands (accumulation, percentile, probability) across all variables
func BandList() []Band {
	var bands []Band
	for _, v := range wpcVariables {
		bands = append(bands, Band{
			FileFragment: v.Ptype + "24i",
			Variable:     v.Name,
			Kind:         KindAccumulationInches,
			ToInches:     v.ToInches,
		})
		for _, pct := range percentiles {
			bands = append(bands, Band{
				FileFragment: "p" + v.Ptype + "24ip0p" + pct,
				Variable:     v.Name,
				Kind:         KindPercentileInches,
				Key:          trimLeadingZero(pct),
				ToInches:     v.ToInches,
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

// An NDFD gridpoint (WFO, X, Y) paired with the WPC grid cell (Col, Row) it falls in
type Gridpoint struct {
	WFO      string
	X, Y     int
	Col, Row int
}

// VariableRow holds one variable's decoded values at a gridpoint; its json tags double as the jsonb column's keys
type VariableRow struct {
	// float32 rather than float64 to match wgrib2's -ieee single-precision output
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

// VariableMatrix holds one decoded value per (gridpoint, band) for a single variable's bands, as a flat float32 array
type VariableMatrix struct {
	bands  []Band
	values []float32 // values[pointIdx*len(bands)+bandIdx]; row() below builds the per-point maps only transiently, one at a time
}

// newVariableMatrix allocates a matrix for n gridpoints across one variable's bands, pre-filled with missingValue
func newVariableMatrix(bands []Band, n int) *VariableMatrix {
	values := make([]float32, n*len(bands))
	for i := range values {
		values[i] = missingValue
	}
	return &VariableMatrix{bands: bands, values: values}
}

func (m *VariableMatrix) set(pointIdx, bandIdx int, v float32) {
	m.values[pointIdx*len(m.bands)+bandIdx] = v
}

// row reconstructs one gridpoint's VariableRow, transiently, from the flat matrix
func (m *VariableMatrix) row(pointIdx int) VariableRow {
	var row VariableRow
	base := pointIdx * len(m.bands)
	for bandIdx, b := range m.bands {
		v := m.values[base+bandIdx]
		if math.IsNaN(float64(v)) {
			continue
		}
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
	return row
}
