package data

import (
	"testing"
	//"github.com/DATA-DOG/go-sqlmock" // Skipping DB mock usage as per previous tests
)

func TestGetRiskOverview_NoDB(t *testing.T) {
	// Since we mock DB interaction by passing specific DB, we can't test without sqlmock or real DB.
	// However, I can test the error handling for nil DB.

	_, err := GetRiskOverview(nil, "US")
	if err == nil {
		t.Error("expected error for nil db")
	}
}
