package gridcache

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	gridpointsTable = "weathergov_ndfd_gridpoints"
	logTable        = "weathergov_ndfd_grid_logs"
	indexTable      = "weathergov_ndfd_grid_index"
)

// 1. Computes the average hits per gridpoint across the interval.
// 2. Counts hits per gridpoint and divides by that average for a relative_heat score.
// 3. Keeps gridpoints at 2x+ the average, tiering cache_radius by how far above (2x/7x/15x).
func heatIndexInsertSQL() string {
	return fmt.Sprintf(`
		INSERT INTO %[3]s (interval_start, wfo, x, y, hit_count, relative_heat, cache_radius)
		WITH batch_stats AS (
			SELECT
				COUNT(*)::float / NULLIF(COUNT(DISTINCT grid_point_id), 0) AS avg_hits
			FROM %[1]s
			WHERE timestamp <= $1
		),
		point_scores AS (
			SELECT
				p.wfo, p.x, p.y,
				COUNT(*) AS hits
			FROM %[1]s l
			JOIN %[2]s p ON l.grid_point_id = p.id
			WHERE l.timestamp <= $1
			GROUP BY p.wfo, p.x, p.y
		)
		SELECT
			$1::timestamp,
			ps.wfo, ps.x, ps.y, ps.hits,
			ROUND((ps.hits / bs.avg_hits)::numeric, 2),
			CASE
				WHEN ps.hits > bs.avg_hits * 15 THEN 3
				WHEN ps.hits > bs.avg_hits * 7  THEN 2
				WHEN ps.hits > bs.avg_hits * 2  THEN 1
			END
		FROM point_scores ps, batch_stats bs
		WHERE (ps.hits / bs.avg_hits) >= 2.0
		ON CONFLICT (interval_start, wfo, x, y) DO NOTHING;
	`, pgx.Identifier{logTable}.Sanitize(), pgx.Identifier{gridpointsTable}.Sanitize(), pgx.Identifier{indexTable}.Sanitize())
}

func gridLogsDeleteSQL() string {
	return fmt.Sprintf(`DELETE FROM %s WHERE timestamp <= $1;`, pgx.Identifier{logTable}.Sanitize())
}

// Both statements use the same cutoff, so the purge only deletes rows the aggregation already saw.
func Process(ctx context.Context, pool *pgxpool.Pool) (int64, error) {
	cutoff := time.Now().UTC()

	tag, err := pool.Exec(ctx, heatIndexInsertSQL(), cutoff)
	if err != nil {
		return 0, fmt.Errorf("aggregating heat index: %w", err)
	}

	if _, err := pool.Exec(ctx, gridLogsDeleteSQL(), cutoff); err != nil {
		return 0, fmt.Errorf("purging grid logs: %w", err)
	}

	return tag.RowsAffected(), nil
}
