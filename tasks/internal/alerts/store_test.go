package alerts

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
)

const (
	forecastZone = "https://api.weather.gov/zones/forecast/GAZ019"
	countyZone   = "https://api.weather.gov/zones/county/GAC111"
)

func zoneFeature() *SourceFeature {
	return &SourceFeature{
		Props: SourceProperties{
			AffectedZones: []string{forecastZone, countyZone},
			Geocode: struct {
				SAME []string `json:"SAME"`
			}{SAME: []string{"013111"}},
		},
	}
}

func TestUnwindGeometryCollection_Nested(t *testing.T) {
	raw := json.RawMessage(`{
      "type": "GeometryCollection",
      "bbox": [0, 0, 1, 1],
      "geometries": [
        {"type": "Point", "coordinates": [0, 0]},
        {"type": "GeometryCollection", "geometries": [
          {"type": "Point", "coordinates": [1, 1]},
          {"type": "Point", "coordinates": [2, 2]}
        ]}
      ]
    }`)

	unwound, err := unwindGeometryCollection(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var got struct {
		Type       string            `json:"type"`
		BBox       []float64         `json:"bbox"`
		Geometries []json.RawMessage `json:"geometries"`
	}
	if err := json.Unmarshal(unwound, &got); err != nil {
		t.Fatalf("could not decode the result: %v", err)
	}

	if len(got.Geometries) != 3 {
		t.Errorf("expected 3 geometries, got %d", len(got.Geometries))
	}
	for _, geometry := range got.Geometries {
		if strings.Contains(string(geometry), "GeometryCollection") {
			t.Errorf("expected no nested collections, got %s", geometry)
		}
	}
	if len(got.BBox) != 4 {
		t.Errorf("expected the sibling keys to survive, got bbox %v", got.BBox)
	}
}

func TestUnwindGeometryCollection_Polygon(t *testing.T) {
	raw := json.RawMessage(`{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}`)

	unwound, err := unwindGeometryCollection(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if string(unwound) != string(raw) {
		t.Errorf("expected %s, got %s", raw, unwound)
	}
}

func TestResolveGeometry_OwnShape(t *testing.T) {
	feature := zoneFeature()
	feature.Geometry = json.RawMessage(`{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,0]]]}`)

	geometry, err := resolveGeometry(feature, map[string]bool{forecastZone: true})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if geometry == nil || string(geometry.Shape) != string(feature.Geometry) {
		t.Errorf("expected the feature's own shape, got %v", geometry)
	}
}

func TestResolveGeometry_NullShape(t *testing.T) {
	feature := zoneFeature()
	feature.Geometry = json.RawMessage(`null`)

	geometry, err := resolveGeometry(feature, map[string]bool{forecastZone: true})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if geometry == nil || geometry.Source != GeometryZones {
		t.Fatalf("expected a zone union, got %v", geometry)
	}
}

func TestResolveGeometry_ZoneUnionDropsCountyZones(t *testing.T) {
	geometry, err := resolveGeometry(zoneFeature(), map[string]bool{forecastZone: true})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if geometry == nil || geometry.Source != GeometryZones {
		t.Fatalf("expected a zone union, got %v", geometry)
	}
	if !reflect.DeepEqual(geometry.IDs, []string{forecastZone}) {
		t.Errorf("expected only the forecast zone, got %v", geometry.IDs)
	}
}

func TestResolveGeometry_UnknownZoneFallsBackToCounties(t *testing.T) {
	geometry, err := resolveGeometry(zoneFeature(), map[string]bool{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if geometry == nil || geometry.Source != GeometryCounties {
		t.Fatalf("expected a county union, got %v", geometry)
	}
	if !reflect.DeepEqual(geometry.IDs, []string{"13111"}) {
		t.Errorf("expected the FIPS code, got %v", geometry.IDs)
	}
}

func TestResolveGeometry_None(t *testing.T) {
	geometry, err := resolveGeometry(&SourceFeature{}, map[string]bool{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if geometry != nil {
		t.Errorf("expected nil, got %v", geometry)
	}
}

func TestQueueRow_Tombstone(t *testing.T) {
	batch := &pgx.Batch{}
	NewStore().queueRow(batch, Row{Hash: "hash-1", AlertKind: KindMarine})

	if batch.Len() != 1 {
		t.Fatalf("expected 1 queued statement, got %d", batch.Len())
	}
	if arguments := batch.QueuedQueries[0].Arguments; arguments[5] != nil {
		t.Errorf("expected a nil shape, got %v", arguments[5])
	}
}

func TestQueueRow_Shape(t *testing.T) {
	batch := &pgx.Batch{}
	shape := json.RawMessage(`{"type":"Point","coordinates":[0,0]}`)
	NewStore().queueRow(batch, Row{
		Hash:      "hash-1",
		AlertKind: KindLand,
		Geometry:  &Geometry{Shape: shape},
	})

	if batch.Len() != 1 {
		t.Fatalf("expected 1 queued statement, got %d", batch.Len())
	}
	if !strings.Contains(batch.QueuedQueries[0].SQL, "weathergov_geo_alerts_cache_staging") {
		t.Errorf("expected the insert to target staging, got:\n%s", batch.QueuedQueries[0].SQL)
	}
	if arguments := batch.QueuedQueries[0].Arguments; arguments[5] != string(shape) {
		t.Errorf("expected the shape bound as $6, got %v", arguments[5])
	}
}

func TestQueueRow_Union(t *testing.T) {
	batch := &pgx.Batch{}
	NewStore().queueRow(batch, Row{
		Hash:      "hash-1",
		AlertKind: KindLand,
		Geometry:  &Geometry{Source: GeometryZones, IDs: []string{forecastZone}},
	})

	if batch.Len() != 1 {
		t.Fatalf("expected 1 queued statement, got %d", batch.Len())
	}

	sql := batch.QueuedQueries[0].SQL
	if !strings.Contains(sql, "ST_SIMPLIFY") {
		t.Errorf("expected the union insert, got:\n%s", sql)
	}
	// The whole point of the CTE, so a regression back to an inlined subquery gets caught
	if count := strings.Count(sql, "ST_Union"); count != 1 {
		t.Errorf("expected ST_Union exactly once, got %d:\n%s", count, sql)
	}
	if arguments := batch.QueuedQueries[0].Arguments; !reflect.DeepEqual(arguments[5], []string{forecastZone}) {
		t.Errorf("expected the zone ids bound as $6, got %v", arguments[5])
	}
}
