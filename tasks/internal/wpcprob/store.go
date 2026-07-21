package wpcprob

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const targetTable = "weathergov_wpc_prob_precip"
const stagingTable = targetTable + "_staging"

// Load results into a staging table, then swap it in for the live table
func StoreResults(ctx context.Context, pool *pgxpool.Pool, gridpoints []Gridpoint, matrix *ValueMatrix, cycle, validTime time.Time) error {
	if _, err := pool.Exec(ctx, fmt.Sprintf(`DROP TABLE IF EXISTS %s`, stagingTable)); err != nil {
		return fmt.Errorf("dropping stale staging table: %w", err)
	}
	if _, err := pool.Exec(ctx, fmt.Sprintf(`CREATE TABLE %s (LIKE %s INCLUDING ALL)`, stagingTable, targetTable)); err != nil {
		return fmt.Errorf("creating staging table: %w", err)
	}

	columns := append([]string{"wfo", "x", "y", "cycle", "valid_time", "updated_at"}, columnNames(matrix.Variables)...)
	now := time.Now()
	source := pgx.CopyFromSlice(len(gridpoints), func(i int) ([]any, error) {
		row := make([]any, 0, len(columns))
		row = append(row, gridpoints[i].WFO, gridpoints[i].X, gridpoints[i].Y, cycle, validTime, now)
		for _, vr := range matrix.Rows[i] {
			if vr.IsEmpty() {
				row = append(row, nil)
			} else {
				row = append(row, vr)
			}
		}
		return row, nil
	})

	if _, err := pool.CopyFrom(ctx, pgx.Identifier{stagingTable}, columns, source); err != nil {
		return fmt.Errorf("copying into staging table: %w", err)
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning swap transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	oldTable := targetTable + "_old"
	if _, err := tx.Exec(ctx, fmt.Sprintf(`DROP TABLE IF EXISTS %s`, oldTable)); err != nil {
		return fmt.Errorf("dropping stale old table: %w", err)
	}
	if _, err := tx.Exec(ctx, fmt.Sprintf(`ALTER TABLE %s RENAME TO %s`, targetTable, oldTable)); err != nil {
		return fmt.Errorf("renaming live table aside: %w", err)
	}
	if _, err := tx.Exec(ctx, fmt.Sprintf(`ALTER TABLE %s RENAME TO %s`, stagingTable, targetTable)); err != nil {
		return fmt.Errorf("promoting staging table: %w", err)
	}
	if _, err := tx.Exec(ctx, fmt.Sprintf(`DROP TABLE %s`, oldTable)); err != nil {
		return fmt.Errorf("dropping old table: %w", err)
	}

	return tx.Commit(ctx)
}

// Build each variable's jsonb column name, in order
func columnNames(variables []string) []string {
	names := make([]string, len(variables))
	for i, v := range variables {
		names[i] = v + "_data"
	}
	return names
}
