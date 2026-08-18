package ghwo

import (
	"context"
	"encoding/json"
	"fmt"
	"tasks/internal"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Because we will initially use staging tables, then swap those out
// with the live tables in one maneuver, we should keep constants for
// the various table names
const targetDataTableName = "weathergov_risk_data"
const targetErrorTableName = "weathergov_risk_wfo_errors"
const wfoTableName = "weathergov_geo_cwas"

var wfoQueryString = fmt.Sprintf(`SELECT DISTINCT wfo FROM %s`, wfoTableName)

/**
* A type that wraps the pgx batches, so we
* can interate on the items
 */
type StoreBatch struct {
	Outputs      []*Output
	batchSize    int
	totalFlushed int

	// We add a SwapTableData struct so that we can
	// manage table names appropriately
	riskSwapData  *internal.SwapTableData
	errorSwapData *internal.SwapTableData
}

func (storeBatch *StoreBatch) getStoreQueryString() string {
	return fmt.Sprintf(
		`INSERT INTO %s (id, data) VALUES($1::text, $2::json) ON CONFLICT (id) DO UPDATE SET data=$2::json`,
		storeBatch.riskSwapData.StagingName,
	)
}

func (storeBatch *StoreBatch) getWFOErrorQueryString() string {
	return fmt.Sprintf(
		`INSERT INTO %s (id, is_error) VALUES ($1::text, true) ON CONFLICT (id) DO UPDATE SET is_error=true`,
		storeBatch.errorSwapData.StagingName,
	)
}

func (storeBatch *StoreBatch) createStagingTables(ctx context.Context, pool *pgxpool.Pool) error {
	// Create each of the staging tables for the two
	// SwapData field members
	err := storeBatch.riskSwapData.CreateStagingTable(ctx, pool)
	if err != nil {
		return err
	}
	logger.Warn("Created staging table", "name", storeBatch.riskSwapData.StagingName)
	err = storeBatch.errorSwapData.CreateStagingTable(ctx, pool)
	if err != nil {
		return err
	}
	logger.Warn("Created staging table", "name", storeBatch.errorSwapData.StagingName)
	return nil
}

func GetWFOsFromDatabase(ctx context.Context, pool *pgxpool.Pool) ([]string, error) {
	rows, err := pool.Query(ctx, wfoQueryString)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result = []string{}
	for rows.Next() {
		var wfo string
		rows.Scan(&wfo)
		result = append(
			result,
			wfo,
		)
	}
	return result, nil
}

func NewBatch(size int) *StoreBatch {
	return &StoreBatch{
		batchSize:    size,
		totalFlushed: 0,
		riskSwapData: internal.NewSwapTables(
			targetDataTableName,
			"_staging",
		),
		errorSwapData: internal.NewSwapTables(
			targetErrorTableName,
			"_staging",
		),
	}
}

func (batch *StoreBatch) add(output *Output) bool {
	batch.Outputs = append(
		batch.Outputs,
		output,
	)

	if len(batch.Outputs) >= batch.batchSize {
		return true
	}

	return false
}

func addToInternalBatch(batch *pgx.Batch, output *Output, riskInsertQueryString, errorInsertQueryString string) error {
	// We assume the default query will be an insertion into the
	// risk_data table
	sql := riskInsertQueryString
	var code string

	// First, we need to see if the output has a WFO level error.
	// If it does, we need to update the separate risk_wfo_errors table
	if output.Errors != nil && output.Errors.Kind == "wfo" {
		sql = errorInsertQueryString
		code = output.Errors.WFO
		batch.Queue(
			sql,
			code,
		)
		return nil
	}

	// Second, check for any state or county level errors.
	if output.Errors != nil {
		code = output.Errors.Locality

		// Write out the output json using the locality
		// code found within the error struct
		bytes, err := json.Marshal(output)
		if err != nil {
			return err
		}

		batch.Queue(
			sql,
			code,
			string(bytes),
		)
	}

	// All other errors will be treated as "success" cases, in that we
	// simply write the output object as JSON to the risk_data table.
	// Any errors within it will be embedded in the JSON data
	if output.IsCounty {
		code = output.Fips
	} else {
		code = output.State
	}

	bytes, err := json.Marshal(output)
	if err != nil {
		return err
	}

	batch.Queue(
		sql,
		code,
		string(bytes),
	)
	return nil
}

func (batch *StoreBatch) flush(ctx context.Context, conn *pgxpool.Pool) error {
	pgBatch := &pgx.Batch{}
	for _, output := range batch.Outputs {
		err := addToInternalBatch(
			pgBatch,
			output,
			batch.getStoreQueryString(),
			batch.getWFOErrorQueryString(),
		)
		if err != nil {
			return err
		}
	}

	batch.totalFlushed += batch.batchSize

	// Send the batch query
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
		request := conn.SendBatch(ctx, pgBatch)
		defer request.Close()
		rows, err := request.Query()
		if err != nil {
			logger.Error("Flush batch query error", "error", err)
			return err
		}
		defer rows.Close()

		// Reset the outputs list
		batch.Outputs = batch.Outputs[:0]

		return nil
	}
}

func (storeBatch *StoreBatch) Finalize(ctx context.Context, pool *pgxpool.Pool) error {
	return nil
}
