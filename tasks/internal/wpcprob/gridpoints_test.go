package wpcprob

import (
	"math"
	"testing"
)

// GridIndex should map the grid's own origin lat/lon back to (col 1, row 1)
func TestGridIndex_Origin(t *testing.T) {
	proj := newWPCProjector(CONUS)

	col, row := proj.GridIndex(gridLat1Deg, gridLon1Deg)
	if col != 1 || row != 1 {
		t.Errorf("expected (1,1), got (%d,%d)", col, row)
	}
}

// GridIndex should place Miami east and south of Denver, both within the grid's bounds
func TestGridIndex_RelativePosition(t *testing.T) {
	proj := newWPCProjector(CONUS)

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
	proj := newWPCProjector(CONUS)

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

// Pins each OCONUS projector to the cell wgrib2 -lon picks for the same point
func TestGridIndex_RegionKnownPoints(t *testing.T) {
	for _, tc := range []struct {
		name     string
		region   Region
		lat, lon float64
		col, row int
	}{
		{"Juneau", Alaska, 58.3019, -134.4197, 1186, 525},
		{"Anchorage", Alaska, 61.2181, -149.9003, 883, 592},
		{"Fairbanks", Alaska, 64.8378, -147.7164, 917, 726},
		// West of the dateline, where the AK grid's longitudes wrap
		{"Attu", Alaska, 52.8, 172.9, 70, 545},
		{"Honolulu", Hawaii, 21.3069, -157.8583, 154, 145},
		{"Hilo", Hawaii, 19.7074, -155.0868, 270, 73},
		{"San Juan", PuertoRico, 18.4655, -66.1057, 162, 132},
		{"St. Thomas", PuertoRico, 18.3419, -64.9307, 260, 121},
	} {
		col, row := newWPCProjector(tc.region).GridIndex(tc.lat, tc.lon)
		if col != tc.col || row != tc.row {
			t.Errorf("%s: expected (%d,%d), got (%d,%d)", tc.name, tc.col, tc.row, col, row)
		}
	}
}

// Pins each OCONUS projection to cs2cs, an independent PROJ build, as fractional cells from the grid origin
func TestGridIndex_RegionMatchesCS2CS(t *testing.T) {
	// echo "<lon> <lat>" | cs2cs -f %.3f +proj=longlat +R=6371200 +to <proj> +R=6371200, for the city and the region's Lon1Deg/Lat1Deg
	// AK: +proj=stere +lat_0=90 +lat_ts=60 +lon_0=-150, HI/PR: +proj=merc +lat_ts=20
	// col = (x - x0) / spacing + 1, row = (y - y0) / spacing + 1, spacing 2976 m for AK, 2500 m for HI, 1250 m for PR
	for _, tc := range []struct {
		name     string
		region   Region
		lat, lon float64
		col, row float64
	}{
		{"Juneau", Alaska, 58.3019, -134.4197, (906538.425+2619377.971)/2976 + 1, (-3251171.170+4810070.201)/2976 + 1},
		{"Anchorage", Alaska, 61.2181, -149.9003, (5308.202+2619377.971)/2976 + 1, (-3050524.223+4810070.201)/2976 + 1},
		{"Attu", Alaska, 52.8, 172.9, (-2413453.452+2619377.971)/2976 + 1, (-3191157.487+4810070.201)/2976 + 1},
		{"Fairbanks", Alaska, 64.8378, -147.7164, (105724.780+2619377.971)/2976 + 1, (-2651241.801+4810070.201)/2976 + 1},
		{"Honolulu", Hawaii, 21.3069, -157.8583, (-16494981.921+16878124.060)/2500 + 1, (2279571.839-1920575.965)/2500 + 1},
		{"Hilo", Hawaii, 19.7074, -155.0868, (-16205381.423+16878124.060)/2500 + 1, (2101120.686-1920575.965)/2500 + 1},
		{"San Juan", PuertoRico, 18.4655, -66.1057, (-6907538.764+7108386.924)/1250 + 1, (1963799.449-1800561.982)/1250 + 1},
		{"St. Thomas", PuertoRico, 18.3419, -64.9307, (-6784760.273+7108386.924)/1250 + 1, (1950188.047-1800561.982)/1250 + 1},
	} {
		p := newWPCProjector(tc.region)
		x, y, _, _ := p.transform(tc.lon, tc.lat, 0)
		col, row := (x-p.x0)/p.dx+1, (y-p.y0)/p.dy+1
		// 0.001 cells is about 3 m on AK's grid
		if math.Abs(col-tc.col) > 0.001 || math.Abs(row-tc.row) > 0.001 {
			t.Errorf("%s: expected (%.3f,%.3f), got (%.3f,%.3f)", tc.name, tc.col, tc.row, col, row)
		}
	}
}

// ToGeographic has to undo FromGeographic, since wgs84.Transform leans on both
func TestPolarStereographic_RoundTrip(t *testing.T) {
	ps := polarStereographic{Lonf: -150, Latts: 60}
	for _, tc := range []struct{ lon, lat float64 }{
		{-134.4197, 58.3019},
		{-149.9003, 61.2181},
		{172.9, 52.8},
		{-178.571, 40.530101},
	} {
		x, y, _ := ps.FromGeographic(tc.lon, tc.lat, 0, wpcSpheroid)
		lon, lat, _ := ps.ToGeographic(x, y, 0, wpcSpheroid)
		// atan2 hands back west of the dateline as below -180
		lon = math.Mod(lon+540, 360) - 180
		if math.Abs(lon-tc.lon) > 1e-9 || math.Abs(lat-tc.lat) > 1e-9 {
			t.Errorf("(%v,%v): round trip gave (%v,%v)", tc.lon, tc.lat, lon, lat)
		}
	}
}
