package wpcprob

import (
	"fmt"
	"math"
	"strings"

	"github.com/wroge/wgs84/v2"
)

// One grib2 file to download, plus how to read the numbers inside it
type Band struct {
	FileFragment string
	Variable     string
	Kind         BandKind
	Key          string // names this band's slot in the stored array, empty for KindAccumulationInches
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

// HI and PR publish rain alone
var rainOnly = []wpcVariable{variableNamed("rain")}

func variableNamed(name string) wpcVariable {
	for _, v := range wpcVariables {
		if v.Name == name {
			return v
		}
	}
	panic("no wpcVariable named " + name)
}

// One WPC feed, its grid, and the CWAs whose gridpoints it covers
type Region struct {
	Name      string // WPC's directory and file name code
	NX, NY    int
	DxM, DyM  float64
	Lat1Deg   float64 // latitude of grid cell (col 1, row 1)
	Lon1Deg   float64 // longitude of grid cell (col 1, row 1)
	CRS       wgs84.CoordinateReferenceSystem
	CWAs      []string // empty picks gridpoints by grid bounds instead
	Variables []wpcVariable
}

var CONUS = Region{
	Name:      "co",
	NX:        gridNX,
	NY:        gridNY,
	DxM:       gridDxM,
	DyM:       gridDyM,
	Lat1Deg:   gridLat1Deg,
	Lon1Deg:   gridLon1Deg,
	CRS:       wpcLCC,
	Variables: wpcVariables,
}

// OCONUS grid values are read off wgrib2 <file> -d 1 -grid on each region's WPC files
var Alaska = Region{
	// polar stereographic (1649 x 1105) lat1 40.530101 lon1 181.429 latD 60 lonV 210 dx 2976 m
	Name:      "ak",
	NX:        1649,
	NY:        1105,
	DxM:       2976,
	DyM:       2976,
	Lat1Deg:   40.530101,
	Lon1Deg:   -178.571,
	CRS:       wpcCRS(polarStereographic{Lonf: -150, Latts: 60}),
	CWAs:      []string{"AFG", "AJK", "AER", "ALU"},
	Variables: wpcVariables,
}

var Hawaii = Region{
	// Mercator (321 x 225) LatD 20 lat1 18.072699 lon 198.474999 to 206.130999, no dx so 2500 m is that span / 320 at LatD 20
	Name:      "hi",
	NX:        321,
	NY:        225,
	DxM:       webMercatorSpacing(2500, 20),
	DyM:       webMercatorSpacing(2500, 20),
	Lat1Deg:   18.072699,
	Lon1Deg:   -161.525001,
	CRS:       wpcCRS(wgs84.WebMercator{}),
	CWAs:      []string{"HFO"},
	Variables: rainOnly,
}

var PuertoRico = Region{
	// Mercator (339 x 225) LatD 20 lat1 16.977485 lon 291.972167 to 296.0156, no dx so 1250 m is that span / 338 at LatD 20
	Name:      "pr",
	NX:        339,
	NY:        225,
	DxM:       webMercatorSpacing(1250, 20),
	DyM:       webMercatorSpacing(1250, 20),
	Lat1Deg:   16.977485,
	Lon1Deg:   -68.027833,
	CRS:       wpcCRS(wgs84.WebMercator{}),
	CWAs:      []string{"SJU"},
	Variables: rainOnly,
}

// Run after CONUS, smallest first so a slow AK can't starve HI and PR
var OCONUSRegions = []Region{Hawaii, PuertoRico, Alaska}

// Order here is the stored array layout, which interop reads back positionally
func BandList(variables []wpcVariable) []Band {
	var bands []Band
	for _, v := range variables {
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

func trimLeadingZero(pct string) string {
	if pct[0] == '0' {
		return pct[1:]
	}
	return pct
}

// WPC writes the decimal point as "p", so "0p01" is the 0.01 inch threshold
func thresholdKey(th string) string {
	return strings.Replace(th, "p", ".", 1)
}

func bandFilename(region string, b Band, cycle, fhour string) string {
	return fmt.Sprintf("ndfd_%s_%s_%sf%s.grib2", region, b.FileFragment, cycle, fhour)
}

// An NDFD gridpoint paired with the flat offset of the WPC grid cell it falls in
type Gridpoint struct {
	Cell int32 // (row-1)*Region.NX + (col-1)
	X, Y int16 // NDFD grid tops out at 613 x 478
	WFO  uint8 // index into the WFO table LoadGridpoints returns, 123 today
}

// Marks a (gridpoint, band) never decoded, and real values are always finite so NaN never collides
var missingValue = float32(math.NaN())

// One decoded value per (gridpoint, period, band) for a single variable, flat
type VariableMatrix struct {
	bands   []Band
	periods int
	values  []float32 // values[pointIdx*width + periodIdx*len(bands) + bandIdx]
}

// Every period's bands laid out end to end, which is one gridpoint's stored array
func (m *VariableMatrix) width() int { return m.periods * len(m.bands) }

func (m *VariableMatrix) set(pointIdx, periodIdx, bandIdx int, v float32) {
	m.values[pointIdx*m.width()+periodIdx*len(m.bands)+bandIdx] = v
}

// One gridpoint's stored array, or nil when this variable has nothing to say here
func (m *VariableMatrix) point(pointIdx int) []float32 {
	row := m.values[pointIdx*m.width() : (pointIdx+1)*m.width()]
	for _, v := range row {
		if v != 0 && !math.IsNaN(float64(v)) {
			return row
		}
	}
	return nil
}

// Size one reusable backing array for the widest variable, so a run makes a single large allocation
func newMatrixBuffer(bands []Band, periods, points int) []float32 {
	widest := 0
	for _, group := range groupByVariable(bands) {
		widest = max(widest, len(group))
	}
	// ~390MB at full scale, which is most of what a run holds live
	return make([]float32, points*periods*widest)
}

// Re-point the shared buffer at one variable's bands and clear it
func matrixFor(buf []float32, bands []Band, periods, points int) *VariableMatrix {
	values := buf[:points*periods*len(bands)]
	for i := range values {
		values[i] = missingValue
	}
	return &VariableMatrix{bands: bands, periods: periods, values: values}
}

// BandList emits each variable's bands contiguously, so a group is just a run
func groupByVariable(bands []Band) [][]Band {
	var groups [][]Band
	for i := 0; i < len(bands); {
		j := i + 1
		for j < len(bands) && bands[j].Variable == bands[i].Variable {
			j++
		}
		groups = append(groups, bands[i:j])
		i = j
	}
	return groups
}
