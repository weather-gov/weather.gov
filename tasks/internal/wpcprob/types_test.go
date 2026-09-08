package wpcprob

import (
	"math"
	"strings"
	"testing"
)

func testBands(n int) []Band {
	bands := make([]Band, n)
	for i := range bands {
		bands[i] = Band{Variable: "rain", Kind: KindProbabilityPercent}
	}
	return bands
}

// set and point should agree on where a (point, period, band) value lives
func TestMatrixRoundTrip(t *testing.T) {
	const points, periods, bands = 3, 3, 4
	m := matrixFor(make([]float32, points*periods*bands), testBands(bands), periods, points)

	m.set(1, 0, 0, 10)
	m.set(1, 2, 3, 20)

	row := m.point(1)
	if len(row) != periods*bands {
		t.Fatalf("expected a row of %d, got %d", periods*bands, len(row))
	}
	if row[0] != 10 {
		t.Errorf("expected 10 in the first slot, got %v", row[0])
	}
	if row[periods*bands-1] != 20 {
		t.Errorf("expected 20 in the last slot, got %v", row[periods*bands-1])
	}
	// A neighbouring gridpoint must not see either value
	for _, v := range m.point(0) {
		if !math.IsNaN(float64(v)) {
			t.Fatalf("expected point 0 to be untouched, got %v", v)
		}
	}
}

// point should return nil for a gridpoint worth no row, whether it decoded zeros or nothing at all
func TestMatrixPointEmpty(t *testing.T) {
	const points, periods, bands = 2, 3, 4
	buf := make([]float32, points*periods*bands)
	m := matrixFor(buf, testBands(bands), periods, points)

	if m.point(0) != nil {
		t.Error("expected an all-NaN gridpoint to be worth no row")
	}

	for periodIdx := range periods {
		for bandIdx := range bands {
			m.set(0, periodIdx, bandIdx, 0)
		}
	}
	if m.point(0) != nil {
		t.Error("expected an all-zero gridpoint to be worth no row")
	}

	m.set(0, 1, 1, 0.5)
	if m.point(0) == nil {
		t.Error("expected a gridpoint with one real value to be worth a row")
	}
}

// The shared buffer must not leak the previous variable's values into the next one
func TestMatrixBufferReuse(t *testing.T) {
	const points, periods = 2, 3
	buf := newMatrixBuffer(BandList(), periods, points)

	wide := matrixFor(buf, testBands(19), periods, points)
	for periodIdx := range periods {
		for bandIdx := range 19 {
			wide.set(0, periodIdx, bandIdx, 1)
		}
	}

	narrow := matrixFor(buf, testBands(16), periods, points)
	if narrow.point(0) != nil {
		t.Error("expected the reused buffer to be cleared before the next variable")
	}
}

// newMatrixBuffer should size for the widest variable, which is rain
func TestNewMatrixBufferSizedForWidest(t *testing.T) {
	const points, periods = 4, 3
	widest := 0
	for _, group := range groupByVariable(BandList()) {
		widest = max(widest, len(group))
	}

	if got := len(newMatrixBuffer(BandList(), periods, points)); got != points*periods*widest {
		t.Errorf("expected a buffer of %d, got %d", points*periods*widest, got)
	}
}

// The stored array layout is positional, so the JS side breaks silently if this order ever moves
func TestBandListLayout(t *testing.T) {
	groups := groupByVariable(BandList())
	if len(groups) != len(wpcVariables) {
		t.Fatalf("expected %d variable groups, got %d", len(wpcVariables), len(groups))
	}

	wantPercentiles := "5,10,25,50,75,90,95"
	wantThresholds := map[string]string{
		"rain":          "0.01,0.10,0.25,0.50,1.00,2.00,3.00,4.00,6.00,8.00,12.0",
		"snow":          "0.10,1.00,2.00,4.00,6.00,8.00,12.0,18.0",
		"freezing_rain": "0.01,0.10,0.25,0.50,0.75,1.00,1.25,1.50,2.00",
	}

	for i, group := range groups {
		variable := wpcVariables[i].Name
		if group[0].Variable != variable {
			t.Fatalf("expected group %d to be %s, got %s", i, variable, group[0].Variable)
		}
		if group[0].Kind != KindAccumulationInches {
			t.Errorf("%s: expected accumulation first, got kind %d", variable, group[0].Kind)
		}

		var percentiles, thresholds []string
		for _, b := range group[1:] {
			switch b.Kind {
			case KindPercentileInches:
				percentiles = append(percentiles, b.Key)
			case KindProbabilityPercent:
				thresholds = append(thresholds, b.Key)
			}
		}

		if got := strings.Join(percentiles, ","); got != wantPercentiles {
			t.Errorf("%s: expected percentiles %s, got %s", variable, wantPercentiles, got)
		}
		if got := strings.Join(thresholds, ","); got != wantThresholds[variable] {
			t.Errorf("%s: expected thresholds %s, got %s", variable, wantThresholds[variable], got)
		}
		if len(group) != 1+len(percentiles)+len(thresholds) {
			t.Errorf("%s: %d bands don't add up to accumulation plus percentiles plus thresholds", variable, len(group))
		}
	}
}
