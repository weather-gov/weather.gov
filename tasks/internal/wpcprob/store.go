package wpcprob

import (
	"context"
	"fmt"
	"time"

	"tasks/internal"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const targetTable = "weathergov_wpc_prob_precip"
const scratchTable = targetTable + "_variable_scratch"

var swapTables = internal.NewSwapTables(targetTable, "_staging")

var (
	createScratchSQL   = fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (wfo text, x integer, y integer, value real[])`, internal.DBSanitize(scratchTable))
	truncateScratchSQL = fmt.Sprintf(`TRUNCATE %s`, internal.DBSanitize(scratchTable))
	dropScratchSQL     = fmt.Sprintf(`DROP TABLE IF EXISTS %s`, internal.DBSanitize(scratchTable))
)

// The column varies by variable, so this one can't be built once up front
func storeVariableSQL(variable string) string {
	return fmt.Sprintf(`
		UPDATE %s AS s
		SET %s = scratch.value
		FROM %s AS scratch
		WHERE s.wfo = scratch.wfo AND s.x = scratch.x AND s.y = scratch.y
	`, internal.DBSanitize(swapTables.StagingName), internal.DBSanitize(dataColumn(variable)), internal.DBSanitize(scratchTable))
}

// Create a fresh staging table and seed it with one identity row per gridpoint
func CreateStaging(ctx context.Context, pool *pgxpool.Pool, gridpoints []Gridpoint, wfos []string, cycle time.Time, validTimes []time.Time) error {
	if err := swapTables.CreateStagingTable(ctx, pool); err != nil {
		return fmt.Errorf("creating staging table: %w", err)
	}

	now := time.Now()
	columns := []string{"wfo", "x", "y", "cycle", "valid_times", "updated_at"}
	source := pgx.CopyFromSlice(len(gridpoints), func(i int) ([]any, error) {
		gp := gridpoints[i]
		return []any{wfos[gp.WFO], int(gp.X), int(gp.Y), cycle, validTimes, now}, nil
	})
	if _, err := pool.CopyFrom(ctx, pgx.Identifier{swapTables.StagingName}, columns, source); err != nil {
		return fmt.Errorf("seeding staging table: %w", err)
	}
	return nil
}

func dataColumn(variable string) string {
	return variable + "_data"
}

// Copy one variable's decoded arrays into a scratch table, then write them into staging in one pass
func StoreVariable(ctx context.Context, pool *pgxpool.Pool, variable string, matrix *VariableMatrix, gridpoints []Gridpoint, wfos []string) error {
	// Reused and truncated per variable rather than recreated, and never holds more than one variable's rows at a time
	if _, err := pool.Exec(ctx, createScratchSQL); err != nil {
		return fmt.Errorf("creating scratch table: %w", err)
	}
	if _, err := pool.Exec(ctx, truncateScratchSQL); err != nil {
		return fmt.Errorf("truncating scratch table: %w", err)
	}

	source := pgx.CopyFromSlice(len(gridpoints), func(i int) ([]any, error) {
		gp := gridpoints[i]
		// A nil slice writes NULL, which is what an all-zero variable is worth
		return []any{wfos[gp.WFO], int(gp.X), int(gp.Y), matrix.point(i)}, nil
	})
	if _, err := pool.CopyFrom(ctx, pgx.Identifier{scratchTable}, []string{"wfo", "x", "y", "value"}, source); err != nil {
		return fmt.Errorf("copying %s values into scratch table: %w", variable, err)
	}

	if _, err := pool.Exec(ctx, storeVariableSQL(variable)); err != nil {
		return fmt.Errorf("writing %s into staging table: %w", variable, err)
	}
	return nil
}

// Drop the scratch table, then promote staging to the live name
func FinalizeStaging(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, dropScratchSQL); err != nil {
		return fmt.Errorf("dropping scratch table: %w", err)
	}
	return swapTables.Swap(ctx, pool)
}
