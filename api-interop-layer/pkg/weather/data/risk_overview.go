package data

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

type RiskOverviewResult map[string]interface{}

func GetRiskOverview(db *sql.DB, placeId string) (RiskOverviewResult, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection required")
	}

	var dataJson []byte
	err := db.QueryRow("SELECT data FROM weathergov_temp_ghwo WHERE id=$1::text", placeId).Scan(&dataJson)
	if err != nil {
		if err == sql.ErrNoRows {
			// Return empty map to indicate not found, let caller handle 404
			return nil, nil // Return nil, nil for not found
		}
		return nil, fmt.Errorf("error fetching risk overview: %v", err)
	}

	var result RiskOverviewResult
	if err := json.Unmarshal(dataJson, &result); err != nil {
		return nil, fmt.Errorf("error parsing risk overview json: %v", err)
	}

	return result, nil
}
