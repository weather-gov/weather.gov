package data

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	util_golang "weathergov/util-golang"
	//"github.com/DATA-DOG/go-sqlmock" // IF available?
	// Go module says go-redis etc available.
	// I can't use sqlmock if it's not in go.mod.
	// I will check go.mod content again?
	// I saw `github.com/lib/pq` but not `go-sqlmock`.
	// So I can't mock DB easily without it.
	// I will skip DB test or use nil DB and expect error logged but function returns result?
	// My code: `if db != nil { ... }`. So I can pass nil db.
)

func TestGetObs_NoDB(t *testing.T) {
	// Mock API
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/gridpoints/TOP/10,20/stations" {
			fmt.Fprintln(w, `{
                "features": [
                    {
                        "properties": {
                            "stationIdentifier": "KTOP",
                            "name": "Topeka, Phillip Billard Municipal Airport",
                            "elevation": { "unitCode": "wmoUnit:m", "value": 268 }
                        },
                        "geometry": { "type": "Point", "coordinates": [-95.62, 39.07] }
                    }
                ]
            }`)
			return
		}
		if r.URL.Path == "/stations/KTOP/observations" {
			// Valid observation
			fmt.Fprintln(w, `{
                "features": [
                    {
                        "properties": {
                            "timestamp": "2023-10-27T12:00:00Z",
                            "textDescription": "Sunny",
                            "icon": "https://api.weather.gov/icons/land/day/few?size=medium",
                            "temperature": { "unitCode": "wmoUnit:degC", "value": 20 },
                            "windSpeed": { "unitCode": "wmoUnit:km_h_1", "value": 10 },
                            "windDirection": { "unitCode": "wmoUnit:degree_(angle)", "value": 180 },
                            "relativeHumidity": { "unitCode": "wmoUnit:percent", "value": 50 }
                        }
                    }
                ]
            }`)
			return
		}
		w.WriteHeader(404)
	}))
	defer ts.Close()

	// Setup Mock Client
	originalClient := util_golang.HTTPClient
	util_golang.HTTPClient = &http.Client{
		Transport: &testTransport{
			Transport: http.DefaultTransport,
			TargetURL: ts.URL,
		},
	}
	defer func() { util_golang.HTTPClient = originalClient }()

	grid := &Grid{WFO: "TOP", X: 10, Y: 20}
	point := &Point{Latitude: 39.0, Longitude: -95.0} // Ensure Point struct is expected
	// My obs.go defines Point struct at bottom of file if not present.
	// But points.go usually deals with lat/lon directly or via Place.
	// obs.go: `func GetObs(grid *Grid, point *Point, ...)`

	place := &Place{Timezone: "UTC"}

	// Pass nil DB
	res, err := GetObs(grid, point, place, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if res.Error {
		t.Fatalf("unexpected error response: %s", res.Message)
	}

	if res.Station["id"] != "KTOP" {
		t.Errorf("expected KTOP station, got %v", res.Station["id"])
	}

	// Check Data
	temp := res.Data["temperature"].(map[string]interface{})
	// value 20 degC.
	// ConvertProperties converts wmoUnit:degC -> degF (usually).
	// Let's assume default conversion config.
	// If conversion happens, value should be ~68 F.
	// Or if unit is degC (wmoUnit:degC), and output mapping exists.
	// I verified convert.go uses unitMapping.
	// I assume unitMapping covers degC.

	// ConvertProperties transforms {unitCode, value} -> {degC: val, degF: val}
	// So "value" key is gone.
	if temp["degC"] == nil {
		t.Errorf("expected temperature degC, got %v", temp)
	}

	// Check heatIndex/feelsLike calculation
	// heatIndex not provided, so feelsLike -> windChill -> temperature.
	// So feelsLike should be == temperature.

	fl := res.Data["feelsLike"].(map[string]interface{})
	if fl["degC"] != temp["degC"] {
		t.Errorf("expected feelsLike %v to equal temp %v", fl["degC"], temp["degC"])
	}
}
