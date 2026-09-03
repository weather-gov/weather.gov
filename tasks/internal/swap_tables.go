package internal

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

/**
* ABOUT
* ------------------------------
* This file provides and interface and corresponding structs/methods
* for managing database tables where you want to create a staging version
* of a table, do some activity to it, then swap that table in for the live
* version of the table in one seamless db transaction.
 */

var (
	tablePKeyQueryString   = `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'p'`
	tableUniqueQueryString = `SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'u'`
	tableIndexQueryString  = `SELECT indexname, indexdef FROM pg_indexes
		WHERE schemaname = 'public' AND tablename = $1
		  AND indexname NOT IN (
		    SELECT conname FROM pg_constraint WHERE conrelid = $1::regclass AND contype IN ('p', 'u')
		  )`
	tableVacuumQueryString = `VACUUM (FULL, ANALYZE) %s`
)

// A struct representing information about table indices
type tableMeta struct {
	pkey, unique string

	// Keyed on the part of the definition a clone keeps, since the names differ
	lookups map[string]string
}

func indexShape(definition string) string {
	_, shape, _ := strings.Cut(definition, " USING ")
	return shape
}

func getRenameConstraintQueryString(from, to, tableName string) string {
	return fmt.Sprintf(
		`ALTER TABLE %s RENAME CONSTRAINT %s TO %s`,
		tableName,
		DBSanitize(from),
		DBSanitize(to),
	)
}

func getRenameIndexQueryString(from, to string) string {
	return fmt.Sprintf(
		`ALTER INDEX %s RENAME TO %s`,
		DBSanitize(from),
		DBSanitize(to),
	)
}

/**
* A struct that specifies a source table name
* and a suffix used for creating a staging version of that table.
* These structs will be used for swapping tables, so that table updates
* can happen in one seamless transaction
 */
type SwapTables interface {
	vacuumStagingTable(ctx context.Context, pool *pgxpool.Pool) error
	getIndexNameStatements(from, to tableMeta) []string
	getSwapStatements() []string
	getDropTableQueryString() string
	getCreateTableQueryString() string

	CreateStagingTable(ctx context.Context, pool *pgxpool.Pool) error
	Swap(ctx context.Context, pool *pgxpool.Pool) error
}

type SwapTableData struct {
	SourceName  string
	StagingName string
	Suffix      string
}

/**
* Retrieves any primary key, uniqueness constraints, and lookup indices
* for a given table. Sets these values inside a tableMeta struct.
 */
func getTableMeta(ctx context.Context, pool *pgxpool.Pool, tableName string) (tableMeta, error) {
	var meta tableMeta

	// Attempt to pull out the primary key information for the table
	err := pool.QueryRow(ctx, tablePKeyQueryString, tableName).Scan(&meta.pkey)
	// If the error is simply indicating that there are no rows, we ignore it.
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return meta, fmt.Errorf("Error finding primary key of %s: %w", tableName, err)
		}
	}

	// Attempt to pull out the unique constraints on the table
	err = pool.QueryRow(ctx, tableUniqueQueryString, tableName).Scan(&meta.unique)
	// If the error is simply indicating that there are no rows, we ignore it.
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return meta, fmt.Errorf("Error finding unique constraints for %s: %w", tableName, err)
		}
	}

	// Attempt to get everything else, which should correspond to the
	// lookup indices
	rows, err := pool.Query(ctx, tableIndexQueryString, tableName)
	if err != nil {
		return meta, fmt.Errorf("Error finding lookup indices of %s: %w", tableName, err)
	}
	defer rows.Close()

	meta.lookups = map[string]string{}
	for rows.Next() {
		var name, definition string
		if err := rows.Scan(&name, &definition); err != nil {
			return meta, fmt.Errorf("Error finding lookup indices of %s: %w", tableName, err)
		}
		meta.lookups[indexShape(definition)] = name
	}

	return meta, rows.Err()
}

/**
* Helper function that will compact the staging table.
* Consumers will likely want to do this once they are done inserting
* into the staging table and are ready to swap.
 */
func (swapData *SwapTableData) vacuumStagingTable(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, fmt.Sprintf(tableVacuumQueryString, DBSanitize(swapData.StagingName))) // nosemgrep
	if err != nil {
		return fmt.Errorf("Error compacting staging table %s: %w", swapData.StagingName, err)
	}

	return nil
}

/**
* Get an ordered list of the SQL statements that will be executed in
* order to actually swap the tables.
 */
func (swapData *SwapTableData) getSwapStatements() []string {
	// Because we will be swapping tables in and out, we need a third table to temporarily
	// hold the values of the existing table before we completely drop it.
	tempTableName := swapData.SourceName + "__old"
	return []string{
		fmt.Sprintf("DROP TABLE IF EXISTS %s", tempTableName),
		fmt.Sprintf("ALTER TABLE %s RENAME TO %s", swapData.SourceName, tempTableName),
		fmt.Sprintf("ALTER TABLE %s RENAME TO %s", swapData.StagingName, swapData.SourceName),
		fmt.Sprintf("DROP TABLE %s", tempTableName),
	}
}

/**
* Get a list of SQL statements that will be executed _after_ the swap statements.
* These statements will restore the various constraint and index names to
* their original values.
 */
func (swapData *SwapTableData) getIndexNameStatements(from, to tableMeta) []string {
	// The reason we need these statements is that the cloning of the live tables
	// via 'CREATE TABLE LIKE' will give the staging table indices names that derive from
	// the staging table itself, not the live table.
	// So once we swap, we need to rename those indices as well.
	var statements []string
	if from.pkey != "" && from.pkey != to.pkey {
		statements = append(statements, getRenameConstraintQueryString(from.pkey, to.pkey, swapData.SourceName))
	}
	if from.unique != "" && from.unique != to.unique {
		statements = append(statements, getRenameConstraintQueryString(from.unique, to.unique, swapData.SourceName))
	}
	for _, shape := range slices.Sorted(maps.Keys(from.lookups)) {
		live, ok := to.lookups[shape]
		if !ok || from.lookups[shape] == live {
			continue
		}
		statements = append(statements, getRenameIndexQueryString(from.lookups[shape], live))
	}
	return statements
}

/**
* Create a new SwapTableData struct
 */
func NewSwapTables(sourceTableName string, suffix string) *SwapTableData {
	result := &SwapTableData{
		SourceName: sourceTableName,
		Suffix:     suffix,
	}
	result.StagingName = result.SourceName + result.Suffix
	return result
}

func (swapData *SwapTableData) getDropTableQueryString() string {
	return fmt.Sprintf(
		`DROP TABLE IF EXISTS %s`,
		swapData.StagingName,
	)
}

func (swapData *SwapTableData) getCreateTableQueryString() string {
	return fmt.Sprintf(
		`CREATE TABLE %s (LIKE %s INCLUDING ALL)`,
		swapData.StagingName,
		swapData.SourceName,
	)
}

func (swapData *SwapTableData) CreateStagingTable(ctx context.Context, pool *pgxpool.Pool) error {
	// Attempt to drop an existing staging table, should it exist
	_, err := pool.Exec(ctx, swapData.getDropTableQueryString())
	if err != nil {
		return err
	}

	// Now create the staging version of the table
	_, err = pool.Exec(ctx, swapData.getCreateTableQueryString())
	if err != nil {
		return err
	}

	return nil
}

/**
* Performs the actual swapping of tables.
* Several important actions occur in order:
* - Compact the staging table
* - Create a transaction, and execute the swap statements on that transaction
* - Execute the metadata renaming statements on that transaction
* - Commit the transaction
*
* Note that consumers should have already called CreateStagingTable()
* for the given SwapTableData, otherwise this function will return an error
 */
func (swapData *SwapTableData) Swap(ctx context.Context, pool *pgxpool.Pool) error {
	// First cleanup the staging table
	err := swapData.vacuumStagingTable(ctx, pool)
	if err != nil {
		return err
	}

	// Get the table metadata struct for each of the source and staging
	// tables
	sourceMeta, err := getTableMeta(ctx, pool, swapData.SourceName)
	if err != nil {
		return err
	}
	stagingMeta, err := getTableMeta(ctx, pool, swapData.StagingName)
	if err != nil {
		return err
	}

	// Get the statements that will be needed for the swap operation
	statements := append(
		swapData.getSwapStatements(),
		swapData.getIndexNameStatements(stagingMeta, sourceMeta)...,
	)

	// Begin a db transaction within which the swap will take place
	transaction, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("Error starting swap db transaction: %w", err)
	}

	// The rollback should always be deferred.
	// When it is successful, the call to this function
	// does nothing (no-op)
	defer transaction.Rollback(ctx)

	for _, statement := range statements {
		_, err := transaction.Exec(ctx, statement)
		if err != nil {
			return fmt.Errorf("Error swapping tables with %q: %w", statement, err)
		}
	}
	return transaction.Commit(ctx)
}
