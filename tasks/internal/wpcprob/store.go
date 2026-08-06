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
const oldTable = targetTable + "_old"

// Quote a table, column, or index name so it's safe to paste into a statement
func ident(name string) string {
	return pgx.Identifier{name}.Sanitize()
}

var (
	dropStagingSQL     = fmt.Sprintf(`DROP TABLE IF EXISTS %s`, ident(stagingTable))
	createStagingSQL   = fmt.Sprintf(`CREATE TABLE %s (LIKE %s INCLUDING ALL)`, ident(stagingTable), ident(targetTable))
	createScratchSQL   = fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (wfo text, x integer, y integer, value jsonb)`, ident(scratchTable))
	truncateScratchSQL = fmt.Sprintf(`TRUNCATE %s`, ident(scratchTable))
	dropScratchSQL     = fmt.Sprintf(`DROP TABLE IF EXISTS %s`, ident(scratchTable))
	vacuumStagingSQL   = fmt.Sprintf(`VACUUM (FULL, ANALYZE) %s`, ident(stagingTable))
)

// The column varies by variable, so this one can't be built once up front
func storeVariableSQL(variable string) string {
	return fmt.Sprintf(`
		UPDATE %s AS s
		SET %s = scratch.value
		FROM %s AS scratch
		WHERE s.wfo = scratch.wfo AND s.x = scratch.x AND s.y = scratch.y
	`, ident(stagingTable), ident(dataColumn(variable)), ident(scratchTable))
}

// CreateStaging creates a fresh staging table and seeds it with one identity row per gridpoint
func CreateStaging(ctx context.Context, pool *pgxpool.Pool, gridpoints []Gridpoint, cycle, validTime time.Time) error {
	if _, err := pool.Exec(ctx, dropStagingSQL); err != nil {
		return fmt.Errorf("dropping stale staging table: %w", err)
	}
	if _, err := pool.Exec(ctx, createStagingSQL); err != nil {
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
	if _, err := pool.Exec(ctx, createScratchSQL); err != nil {
		return fmt.Errorf("creating scratch table: %w", err)
	}
	if _, err := pool.Exec(ctx, truncateScratchSQL); err != nil {
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

	if _, err := pool.Exec(ctx, storeVariableSQL(variable)); err != nil {
		return fmt.Errorf("writing %s into staging table: %w", variable, err)
	}
	return nil
}

// FinalizeStaging swaps the staging table into place as the live table and drops the scratch table
func FinalizeStaging(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, dropScratchSQL); err != nil {
		return fmt.Errorf("dropping scratch table: %w", err)
	}

	// One UPDATE per variable leaves three dead versions of every row for the swap to promote into the live table
	if _, err := pool.Exec(ctx, vacuumStagingSQL); err != nil {
		return fmt.Errorf("compacting staging table: %w", err)
	}

	liveNames, err := fetchIndexNames(ctx, pool, targetTable)
	if err != nil {
		return fmt.Errorf("reading live table's index names: %w", err)
	}
	stagingNames, err := fetchIndexNames(ctx, pool, stagingTable)
	if err != nil {
		return fmt.Errorf("reading staging table's index names: %w", err)
	}

	return swapInStagingTable(ctx, pool, stagingNames, liveNames)
}

// Promote the staging table to the live name in one transaction, so readers never see a missing table
func swapInStagingTable(ctx context.Context, pool *pgxpool.Pool, stagingNames, liveNames indexNames) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning swap transaction: %w", err)
	}
	// Rollback is a no-op once the transaction commits
	defer tx.Rollback(ctx)

	statements := append(swapStatements(), restoreIndexNameStatements(stagingNames, liveNames)...)
	for _, statement := range statements {
		if _, err := tx.Exec(ctx, statement); err != nil {
			return fmt.Errorf("swapping tables with %q: %w", statement, err)
		}
	}
	return tx.Commit(ctx)
}

// The rename dance that puts the staging table under the live name, in order
func swapStatements() []string {
	return []string{
		fmt.Sprintf(`DROP TABLE IF EXISTS %s`, ident(oldTable)),
		fmt.Sprintf(`ALTER TABLE %s RENAME TO %s`, ident(targetTable), ident(oldTable)),
		fmt.Sprintf(`ALTER TABLE %s RENAME TO %s`, ident(stagingTable), ident(targetTable)),
		fmt.Sprintf(`DROP TABLE %s`, ident(oldTable)),
	}
}

// Rename the promoted table's constraints and indexes back to the names the live table had
func restoreIndexNameStatements(from, to indexNames) []string {
	// CREATE TABLE LIKE names these after the staging table, so without this they gain a suffix every run
	var statements []string
	if from.pkey != to.pkey {
		statements = append(statements, renameConstraintSQL(from.pkey, to.pkey))
	}
	if from.unique != to.unique {
		statements = append(statements, renameConstraintSQL(from.unique, to.unique))
	}
	if from.lookup != to.lookup {
		statements = append(statements, renameIndexSQL(from.lookup, to.lookup))
	}
	return statements
}

func renameConstraintSQL(from, to string) string {
	return fmt.Sprintf(`ALTER TABLE %s RENAME CONSTRAINT %s TO %s`, ident(targetTable), ident(from), ident(to))
}

func renameIndexSQL(from, to string) string {
	return fmt.Sprintf(`ALTER INDEX %s RENAME TO %s`, ident(from), ident(to))
}

// The constraint and index names a table carries, which have to survive the swap
type indexNames struct {
	pkey, unique, lookup string
}

// Read a table's primary key, unique constraint, and lookup index names out of the catalog
func fetchIndexNames(ctx context.Context, pool *pgxpool.Pool, table string) (indexNames, error) {
	var n indexNames

	if err := pool.QueryRow(ctx, `
		SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'p'
	`, table).Scan(&n.pkey); err != nil {
		return n, fmt.Errorf("finding primary key of %s: %w", table, err)
	}

	if err := pool.QueryRow(ctx, `
		SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'u'
	`, table).Scan(&n.unique); err != nil {
		return n, fmt.Errorf("finding unique constraint of %s: %w", table, err)
	}

	// Anything left after excluding the constraint-backed indexes is the plain lookup index
	if err := pool.QueryRow(ctx, `
		SELECT indexname FROM pg_indexes
		WHERE schemaname = 'public' AND tablename = $1
		  AND indexname NOT IN (
		    SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('p', 'u')
		  )
	`, table).Scan(&n.lookup); err != nil {
		return n, fmt.Errorf("finding lookup index of %s: %w", table, err)
	}

	return n, nil
}
