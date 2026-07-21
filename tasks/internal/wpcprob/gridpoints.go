package wpcprob

import (
	"context"
	"fmt"
	"math"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/wroge/wgs84/v2"
)

// A sphere per NDFD's grid definition (GRIB2 GDS template 3.30, earth-shape 6) — wgs84.WGS84 is an ellipsoid and would shift points by several km.
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

type wpcProjector struct {
	transform wgs84.Func
	x0, y0    float64
}

// Build a projector anchored on the grid's origin point (row 1, col 1)
func newWPCProjector() *wpcProjector {
	// Same Datum on both sides, so this can never error.
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

// Load every gridpoint from the db and project it onto the WPC grid
func LoadGridpoints(ctx context.Context, pool *pgxpool.Pool) ([]Gridpoint, error) {
	proj := newWPCProjector()

	rows, err := pool.Query(ctx, `SELECT cwa, x, y, ST_Y(point), ST_X(point) FROM weathergov_geo_gridpoints`)
	if err != nil {
		return nil, fmt.Errorf("querying gridpoints: %w", err)
	}
	defer rows.Close()

	var points []Gridpoint
	for rows.Next() {
		var wfo string
		var x, y int
		var lat, lon float64
		if err := rows.Scan(&wfo, &x, &y, &lat, &lon); err != nil {
			return nil, fmt.Errorf("scanning gridpoint row: %w", err)
		}
		col, row := proj.GridIndex(lat, lon)
		points = append(points, Gridpoint{WFO: wfo, X: x, Y: y, Col: col, Row: row})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating gridpoints: %w", err)
	}

	return points, nil
}
