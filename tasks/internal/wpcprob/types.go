package wpcprob

import (
	"fmt"
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
func (k BandKind) convert(raw float64) float64 {
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

// VariableRow holds one variable's decoded values; its json tags double as the jsonb column's keys.
type VariableRow struct {
	Accumulation  *float64           `json:"accumulation,omitempty"`
	Percentiles   map[string]float64 `json:"percentiles,omitempty"`
	Probabilities map[string]float64 `json:"probabilities,omitempty"`
}

// IsEmpty reports whether nothing was decoded for this variable at this gridpoint
func (r VariableRow) IsEmpty() bool {
	return r.Accumulation == nil && len(r.Percentiles) == 0 && len(r.Probabilities) == 0
}

type ValueMatrix struct {
	Variables []string
	Rows      [][]VariableRow // Rows[pointIdx][index into Variables]
}

// Allocate an n-row matrix; each row starts as len(variables) zero-value VariableRows
func NewValueMatrix(bands []Band, n int) *ValueMatrix {
	variables := variableNames(bands)
	rows := make([][]VariableRow, n)
	for i := range rows {
		rows[i] = make([]VariableRow, len(variables))
	}
	return &ValueMatrix{Variables: variables, Rows: rows}
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
