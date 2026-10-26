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

// Puts a projection on the same sphere the rest of WPC's grids use
func wpcCRS(cs wgs84.CoordinateSystem) wgs84.CoordinateReferenceSystem {
	return wgs84.CoordinateReferenceSystem{Datum: wpcDatum, CoordinateSystem: cs}
}

const degToRad = math.Pi / 180

// North polar stereographic (EPSG:9829) on a sphere, true to scale at Latts, which wgs84 doesn't ship
type polarStereographic struct {
	Lonf, Latts float64
}

func (p polarStereographic) FromGeographic(lon, lat, h float64, s wgs84.Spheroid) (east, north, h2 float64) {
	// Snyder ch. 21 https://pubs.usgs.gov/publication/pp1395 and https://epsg.io/9829-method
	// 1 + sin(Latts) in place of 2 moves true scale from the pole down to Latts
	rho := s.A * (1 + math.Sin(p.Latts*degToRad)) * math.Tan(math.Pi/4-lat*degToRad/2)
	theta := (lon - p.Lonf) * degToRad
	return rho * math.Sin(theta), -rho * math.Cos(theta), h
}

func (p polarStereographic) ToGeographic(east, north, h float64, s wgs84.Spheroid) (lon, lat, h2 float64) {
	rho := math.Hypot(east, north)
	lat = (math.Pi/2 - 2*math.Atan(rho/(s.A*(1+math.Sin(p.Latts*degToRad))))) / degToRad
	lon = p.Lonf + math.Atan2(east, -north)/degToRad
	return lon, lat, h
}

// WebMercator is true to scale at the equator, so spacing WPC quotes at latDeg stretches by 1/cos(latDeg)
func webMercatorSpacing(m, latDeg float64) float64 {
	// Snyder ch. 7 https://pubs.usgs.gov/publication/pp1395
	return m / math.Cos(latDeg*degToRad)
}

// Converts lat/lon into WPC grid coordinates, measured from the grid's origin
type wpcProjector struct {
	transform wgs84.Func
	x0, y0    float64
	dx, dy    float64 // CONUS 2539.703 m, AK 2976 m, HI 2500 m, PR 1250 m
}

// Build a projector anchored on the grid's origin point (row 1, col 1)
func newWPCProjector(r Region) *wpcProjector {
	// Both sides share a Datum, so this can never error
	transform, _ := wgs84.Transform(wpcGeographic, r.CRS)
	x0, y0, _, _ := transform(r.Lon1Deg, r.Lat1Deg, 0)
	return &wpcProjector{transform: transform, x0: x0, y0: y0, dx: r.DxM, dy: r.DyM}
}

// Convert a lat/lon into the nearest 1-based grid col/row
func (p *wpcProjector) GridIndex(lat, lon float64) (col, row int) {
	x, y, _, _ := p.transform(lon, lat, 0)
	col = int(math.Round((x-p.x0)/p.dx)) + 1
	row = int(math.Round((y-p.y0)/p.dy)) + 1
	return col, row
}

// CONUS takes every gridpoint inside its grid, OCONUS only its own CWAs since AK's grid reaches into the Pacific Northwest
func gridpointsQuery(r Region) (string, []any) {
	query := `SELECT cwa, x, y, ST_Y(point), ST_X(point) FROM weathergov_geo_gridpoints`
	if len(r.CWAs) == 0 {
		return query, nil
	}
	return query + ` WHERE cwa = ANY($1)`, []any{r.CWAs}
}

// Second return is the WFO table that Gridpoint.WFO indexes into
func LoadGridpoints(ctx context.Context, pool *pgxpool.Pool, region Region) ([]Gridpoint, []string, error) {
	proj := newWPCProjector(region)

	query, args := gridpointsQuery(region)
	rows, err := pool.Query(ctx, query, args...)
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
		if col < 1 || col > region.NX || row < 1 || row > region.NY {
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
			Cell: int32((row-1)*region.NX + (col - 1)),
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
