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
const scratchTable = targetTable + "_variable_scratch"

// CreateStaging creates a fresh staging table and seeds it with one identity row per gridpoint
func CreateStaging(ctx context.Context, pool *pgxpool.Pool, gridpoints []Gridpoint, cycle, validTime time.Time) error {
	if _, err := pool.Exec(ctx, fmt.Sprintf(`DROP TABLE IF EXISTS %s`, stagingTable)); err != nil {
		return fmt.Errorf("dropping stale staging table: %w", err)
	}
	if _, err := pool.Exec(ctx, fmt.Sprintf(`CREATE TABLE %s (LIKE %s INCLUDING ALL)`, stagingTable, targetTable)); err != nil {
		return fmt.Errorf("creating staging table: %w", err)
	}

	now := time.Now()
	columns := []string{"wfo", "x", "y", "cycle", "valid_time", "updated_at"}
	source := pgx.CopyFromSlice(len(gridpoints), func(i int) ([]any, error) {
		gp := gridpoints[i]
		return []any{gp.WFO, gp.X, gp.Y, cycle, validTime, now}, nil
	})
	if _, err := pool.CopyFrom(ctx, pgx.Identifier{stagingTable}, columns, source); err != nil {
		return fmt.Errorf("seeding staging table: %w", err)
	}
	return nil
}

func dataColumn(variable string) string {
	return variable + "_data"
}

// StoreVariable copies one variable's decoded rows into a scratch table, then writes them into the staging table's variable column in one pass
func StoreVariable(ctx context.Context, pool *pgxpool.Pool, variable string, matrix *VariableMatrix, gridpoints []Gridpoint) error {
	// Reused and truncated per variable rather than recreated, and never holds more than one variable's rows at a time
	if _, err := pool.Exec(ctx, fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (wfo text, x integer, y integer, value jsonb)`, scratchTable)); err != nil {
		return fmt.Errorf("creating scratch table: %w", err)
	}
	if _, err := pool.Exec(ctx, fmt.Sprintf(`TRUNCATE %s`, scratchTable)); err != nil {
		return fmt.Errorf("truncating scratch table: %w", err)
	}

	source := pgx.CopyFromSlice(len(gridpoints), func(i int) ([]any, error) {
		gp := gridpoints[i]
		row := matrix.row(i)
		if row.IsEmpty() {
			return []any{gp.WFO, gp.X, gp.Y, nil}, nil
		}
		return []any{gp.WFO, gp.X, gp.Y, row}, nil
	})
	if _, err := pool.CopyFrom(ctx, pgx.Identifier{scratchTable}, []string{"wfo", "x", "y", "value"}, source); err != nil {
		return fmt.Errorf("copying %s values into scratch table: %w", variable, err)
	}

	column := dataColumn(variable)
	sql := fmt.Sprintf(`
		UPDATE %s AS s
		SET %s = scratch.value
		FROM %s AS scratch
		WHERE s.wfo = scratch.wfo AND s.x = scratch.x AND s.y = scratch.y
	`, stagingTable, column, scratchTable)
	if _, err := pool.Exec(ctx, sql); err != nil {
		return fmt.Errorf("writing %s into staging table: %w", variable, err)
	}
	return nil
}

// FinalizeStaging swaps the staging table into place as the live table and drops the scratch table
func FinalizeStaging(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, fmt.Sprintf(`DROP TABLE IF EXISTS %s`, scratchTable)); err != nil {
		return fmt.Errorf("dropping scratch table: %w", err)
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
