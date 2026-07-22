package gridcache

import (
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
)

// heatIndexInsertSQL should read from the log/gridpoint tables and write into the index table
func TestHeatIndexInsertSQL_Tables(t *testing.T) {
	sql := heatIndexInsertSQL()

	for _, want := range []string{
		"INSERT INTO " + pgx.Identifier{indexTable}.Sanitize(),
		"FROM " + pgx.Identifier{logTable}.Sanitize(),
		"JOIN " + pgx.Identifier{gridpointsTable}.Sanitize(),
	} {
		if !strings.Contains(sql, want) {
			t.Errorf("expected insert SQL to contain %q, got:\n%s", want, sql)
		}
	}
}

// heatIndexInsertSQL should only keep points at or above the 2x hit-rate threshold
func TestHeatIndexInsertSQL_Threshold(t *testing.T) {
	sql := heatIndexInsertSQL()

	if !strings.Contains(sql, "(ps.hits / bs.avg_hits) >= 2.0") {
		t.Errorf("expected insert SQL to filter on the 2x threshold, got:\n%s", sql)
	}
}

// heatIndexInsertSQL should no-op on a repeat interval_start/wfo/x/y instead of erroring
func TestHeatIndexInsertSQL_OnConflict(t *testing.T) {
	sql := heatIndexInsertSQL()

	if !strings.Contains(sql, "ON CONFLICT (interval_start, wfo, x, y) DO NOTHING") {
		t.Errorf("expected insert SQL to have an ON CONFLICT DO NOTHING clause, got:\n%s", sql)
	}
}

// gridLogsDeleteSQL should purge the same log table the insert reads from
func TestGridLogsDeleteSQL(t *testing.T) {
	sql := gridLogsDeleteSQL()
	want := "DELETE FROM " + pgx.Identifier{logTable}.Sanitize()

	if !strings.Contains(sql, want) {
		t.Errorf("expected delete SQL to contain %q, got %q", want, sql)
	}
}
