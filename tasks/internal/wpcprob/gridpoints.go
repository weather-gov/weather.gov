package wpcprob

import (
	"context"
	"fmt"
	"math"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/wroge/wgs84/v2"
)

// A sphere, per NDFD's grid definition; the built-in wgs84.WGS84 ellipsoid shifts points by several km
var wpcSpheroid = wgs84.Spheroid{A: wpcEarthRadiusM, Fi: math.Inf(1)}

var wpcDatum = wgs84.Datum{Spheroid: wpcSpheroid}

var wpcGeographic = wgs84.CoordinateReferenceSystem{Datum: wpcDatum, CoordinateSystem: wgs84.Geographic{}}

var wpcLCC = wgs84.CoordinateReferenceSystem{
	Datum: wpcDatum,
	CoordinateSystem: wgs84.LambertConformalConic2SP{
		Lonf: wpcCentralMerid,
		Latf: wpcStdParallel,
		Sp1:  wpcStdParallel,
		Sp2:  wpcStdParallel,
	},
}

// Converts lat/lon into WPC grid coordinates, measured from the grid's origin
type wpcProjector struct {
	transform wgs84.Func
	x0, y0    float64
}

// Build a projector anchored on the grid's origin point (row 1, col 1)
func newWPCProjector() *wpcProjector {
	// Both sides share a Datum, so this can never error
	transform, _ := wgs84.Transform(wpcGeographic, wpcLCC)
	x0, y0, _, _ := transform(gridLon1Deg, gridLat1Deg, 0)
	return &wpcProjector{transform: transform, x0: x0, y0: y0}
}

// Convert a lat/lon into the nearest 1-based grid col/row
func (p *wpcProjector) GridIndex(lat, lon float64) (col, row int) {
	x, y, _, _ := p.transform(lon, lat, 0)
	col = int(math.Round((x-p.x0)/gridDxM)) + 1
	row = int(math.Round((y-p.y0)/gridDyM)) + 1
	return col, row
}

// Second return is the WFO table that Gridpoint.WFO indexes into
func LoadGridpoints(ctx context.Context, pool *pgxpool.Pool) ([]Gridpoint, []string, error) {
	proj := newWPCProjector()

	rows, err := pool.Query(ctx, `SELECT cwa, x, y, ST_Y(point), ST_X(point) FROM weathergov_geo_gridpoints`)
	if err != nil {
		return nil, nil, fmt.Errorf("querying gridpoints: %w", err)
	}
	defer rows.Close()

	var points []Gridpoint
	var wfos []string
	wfoIndex := map[string]uint8{}

	for rows.Next() {
		var wfo string
		var x, y int
		var lat, lon float64
		if err := rows.Scan(&wfo, &x, &y, &lat, &lon); err != nil {
			return nil, nil, fmt.Errorf("scanning gridpoint row: %w", err)
		}

		col, row := proj.GridIndex(lat, lon)
		if col < 1 || col > gridNX || row < 1 || row > gridNY {
			continue
		}

		idx, ok := wfoIndex[wfo]
		if !ok {
			if len(wfos) > math.MaxUint8 {
				return nil, nil, fmt.Errorf("more than %d WFOs, which no longer fits Gridpoint.WFO", math.MaxUint8+1)
			}
			idx = uint8(len(wfos))
			wfoIndex[wfo] = idx
			wfos = append(wfos, wfo)
		}

		points = append(points, Gridpoint{
			Cell: int32((row-1)*gridNX + (col - 1)),
			X:    int16(x),
			Y:    int16(y),
			WFO:  idx,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, nil, fmt.Errorf("iterating gridpoints: %w", err)
	}

	return points, wfos, nil
}
