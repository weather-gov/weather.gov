package alerts

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"

	"tasks/internal"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	cacheTable    = "weathergov_geo_alerts_cache"
	stagingSuffix = "_staging"
	zonesTable    = "weathergov_geo_zones"
	countiesTable = "weathergov_geo_counties"

	wgs84          = 4326
	webMercator    = 3857
	simplifyMeters = 200
)

var (
	knownZonesQueryString = fmt.Sprintf(`SELECT id FROM %s WHERE id = ANY($1)`, internal.DBSanitize(zonesTable))

	unionSelects = map[GeometrySource]string{
		GeometryZones: fmt.Sprintf(
			`SELECT ST_Union(shape) AS shape FROM %s WHERE id = ANY($6)`,
			internal.DBSanitize(zonesTable),
		),
		GeometryCounties: fmt.Sprintf(
			`SELECT ST_Union(shape) AS shape FROM %s WHERE countyfips = ANY($6)`,
			internal.DBSanitize(countiesTable),
		),
	}
)

const countyZonePath = "/county/"

// Writes go to a staging table that replaces the live one at the end of the run
type Store struct {
	swap *internal.SwapTableData

	insertShape      string
	insertUnion      map[GeometrySource]string
	backfillGeometry string
}

func NewStore() *Store {
	swap := internal.NewSwapTables(cacheTable, stagingSuffix)
	table := internal.DBSanitize(swap.StagingName)

	// Built once here rather than per row, since there are only ever these three
	store := &Store{
		swap:        swap,
		insertUnion: make(map[GeometrySource]string, len(unionSelects)),

		insertShape: fmt.Sprintf(`
      INSERT INTO %s
        (hash, alertJson, counties, states, alertKind, shape, shape_simplified)
        VALUES
          ($1, $2, $3, $4, $5,

          ST_SetSRID(ST_GeomFromGeoJson($6), %d),
          ST_SetSRID(ST_GeomFromGeoJson($6), %d)
        );`, table, wgs84, wgs84),

		// One pass at the end of the load rather than a statement per row
		backfillGeometry: fmt.Sprintf(`
        UPDATE %s
        SET alertjson = jsonb_set(
          alertjson,
          '{geometry}',
          ST_AsGeoJSON(shape_simplified)::jsonb
        )
        WHERE shape_simplified IS NOT NULL
      `, table),
	}

	for source, union := range unionSelects {
		store.insertUnion[source] = insertUnionSQL(table, union)
	}
	return store
}

// The union feeds both columns from one CTE, so ST_Union runs once per alert
func insertUnionSQL(table, union string) string {
	// WGS84 units are degrees, so simplify on a meter grid and transform back
	return fmt.Sprintf(`
      WITH unioned AS (%s)
      INSERT INTO %s
        (hash, alertJson, counties, states, alertKind, shape, shape_simplified)
        SELECT
          $1, $2, $3, $4, $5,

          unioned.shape,

          ST_TRANSFORM(
            ST_SIMPLIFY(
              ST_TRANSFORM(
                unioned.shape,
                %d
              ),
              %d
            ),
            %d
          )
        FROM unioned;`, union, table, webMercator, simplifyMeters, wgs84)
}

func (store *Store) Create(ctx context.Context, pool *pgxpool.Pool) error {
	if err := store.swap.CreateStagingTable(ctx, pool); err != nil {
		return fmt.Errorf("creating staging table: %w", err)
	}
	return nil
}

func (store *Store) Swap(ctx context.Context, pool *pgxpool.Pool) error {
	if err := store.swap.Swap(ctx, pool); err != nil {
		return fmt.Errorf("swapping in staging table: %w", err)
	}
	return nil
}

const geometryCollection = "GeometryCollection"

func isCollection(raw json.RawMessage) (bool, error) {
	var node struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(raw, &node); err != nil {
		return false, fmt.Errorf("reading geometry type: %w", err)
	}
	return node.Type == geometryCollection, nil
}

// Depth first, so a collection nested at any depth comes back as a flat list of shapes
func flattenGeometries(raw json.RawMessage) ([]json.RawMessage, error) {
	collection, err := isCollection(raw)
	if err != nil {
		return nil, err
	}
	if !collection {
		return []json.RawMessage{raw}, nil
	}

	var node struct {
		Geometries []json.RawMessage `json:"geometries"`
	}
	if err := json.Unmarshal(raw, &node); err != nil {
		return nil, err
	}

	flattened := []json.RawMessage{}
	for _, child := range node.Geometries {
		children, err := flattenGeometries(child)
		if err != nil {
			return nil, err
		}
		flattened = append(flattened, children...)
	}
	return flattened, nil
}

// PostGIS rejects nested GeometryCollections, so flatten the children into one collection
func unwindGeometryCollection(raw json.RawMessage) (json.RawMessage, error) {
	collection, err := isCollection(raw)
	if err != nil {
		return nil, err
	}
	if !collection {
		return raw, nil
	}

	// A map so sibling keys like bbox survive
	var object map[string]json.RawMessage
	if err := json.Unmarshal(raw, &object); err != nil {
		return nil, err
	}

	flattened, err := flattenGeometries(raw)
	if err != nil {
		return nil, err
	}
	geometries, err := json.Marshal(flattened)
	if err != nil {
		return nil, err
	}
	object["geometries"] = geometries

	return json.Marshal(object)
}

// Prefer an alert's own GeoJSON, then its zones, then its SAME counties
func resolveGeometry(feature *SourceFeature, knownZones map[string]bool) (*Geometry, error) {
	if len(feature.Geometry) > 0 && string(feature.Geometry) != "null" {
		shape, err := unwindGeometryCollection(feature.Geometry)
		if err != nil {
			return nil, err
		}
		return &Geometry{Shape: shape}, nil
	}

	// Drop county zones because counties aren't stored in the zones table
	zones := []string{}
	for _, zone := range feature.Props.AffectedZones {
		if !strings.Contains(zone, countyZonePath) {
			zones = append(zones, zone)
		}
	}

	if len(zones) > 0 {
		known := 0
		for _, zone := range zones {
			if knownZones[zone] {
				known++
			}
		}

		// A gap means our zone list is stale, or upstream sent a zone that doesn't exist
		if known != len(zones) {
			logger.Error("no matching zones found", "zones", zones)
		} else {
			return &Geometry{Source: GeometryZones, IDs: zones}, nil
		}
	}

	counties := feature.Props.Geocode.SAME
	if len(counties) > 0 {
		fips := make([]string, 0, len(counties))
		for _, same := range counties {
			fips = append(fips, fipsFromSAME(same))
		}
		return &Geometry{Source: GeometryCounties, IDs: fips}, nil
	}

	return nil, nil
}

func KnownZones(ctx context.Context, pool *pgxpool.Pool, ids []string) (map[string]bool, error) {
	known := map[string]bool{}
	if len(ids) == 0 {
		return known, nil
	}

	rows, err := pool.Query(ctx, knownZonesQueryString, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		known[id] = true
	}
	return known, rows.Err()
}

func (store *Store) queueRow(batch *pgx.Batch, row Row) {
	// A tombstoned alert binds a nil $6, which lands as a null shape
	if row.Geometry == nil || row.Geometry.Source == GeometryInline {
		var shape any
		if row.Geometry != nil {
			shape = string(row.Geometry.Shape)
		}
		batch.Queue(store.insertShape, row.Hash, string(row.AlertJSON), string(row.Counties), string(row.States), row.AlertKind, shape)
		return
	}
	batch.Queue(store.insertUnion[row.Geometry.Source], row.Hash, string(row.AlertJSON), string(row.Counties), string(row.States), row.AlertKind, row.Geometry.IDs)
}

const storeChunkSize = 50

// Returns how many rows landed, which is not always len(rows)
func (store *Store) Load(ctx context.Context, pool *pgxpool.Pool, rows []Row) (int, error) {
	if len(rows) == 0 {
		return 0, nil
	}

	// One batch runs on one connection, so chunks go out across the pool instead
	chunks := make(chan []Row, (len(rows)+storeChunkSize-1)/storeChunkSize)
	for start := 0; start < len(rows); start += storeChunkSize {
		chunks <- rows[start:min(start+storeChunkSize, len(rows))]
	}
	close(chunks)

	workers := min(int(pool.Config().MaxConns), len(chunks))

	var stored atomic.Int64
	var wg sync.WaitGroup
	for workerID := range workers {
		wg.Go(func() {
			for chunk := range chunks {
				batch := &pgx.Batch{}
				for _, row := range chunk {
					store.queueRow(batch, row)
				}

				// A chunk is one implicit transaction, so one bad shape loses the whole chunk
				if err := pool.SendBatch(ctx, batch).Close(); err != nil {
					logger.Error("chunk write failed, replaying row by row", "worker", workerID, "err", err)
					stored.Add(int64(store.storeIndividually(ctx, pool, chunk)))
					continue
				}
				stored.Add(int64(len(chunk)))
			}
		})
	}
	wg.Wait()

	if _, err := pool.Exec(ctx, store.backfillGeometry); err != nil {
		return int(stored.Load()), fmt.Errorf("backfilling geometry: %w", err)
	}

	return int(stored.Load()), nil
}

func (store *Store) storeIndividually(ctx context.Context, pool *pgxpool.Pool, rows []Row) int {
	stored := 0
	for _, row := range rows {
		single := &pgx.Batch{}
		store.queueRow(single, row)
		if err := pool.SendBatch(ctx, single).Close(); err != nil {
			logger.Error("error adding alert to cache", "hash", row.Hash, "err", err)
			continue
		}
		stored++
	}
	return stored
}
