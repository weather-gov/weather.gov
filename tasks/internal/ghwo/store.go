package ghwo

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var storeQueryString = `INSERT INTO weathergov_temp_ghwo (id, data) VALUES($1::text, $2::json) ON CONFLICT (id) DO UPDATE SET data=$2::json`
var wfoQueryString = `SELECT DISTINCT wfo FROM weathergov_geo_cwas`

/**
* A type that wraps the pgx batches, so we
* can interate on the items
 */
type StoreBatch struct {
	Outputs   []*Output
	batchSize int
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
		batchSize: size,
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

func (batch *StoreBatch) flush(ctx context.Context, conn *pgxpool.Pool) error {
	pgBatch := &pgx.Batch{}
	for _, output := range batch.Outputs {
		var code string
		if output.IsCounty {
			code = output.Fips
		} else {
			code = output.State
		}
		// First, attempt to marshal the output to json
		bytes, err := json.Marshal(output)
		if err != nil {
			return err
		}
		pgBatch.Queue(
			storeQueryString,
			code,
			string(bytes),
		)
	}

	logger.Info("Flushing store batch output", "batchSize", batch.batchSize, "outputSize", len(batch.Outputs))

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
