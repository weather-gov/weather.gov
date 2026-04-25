package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/weathergov/api-interop-golang/data"
)

func main() {
	SetupDatabase()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"ok":    true,
			"index": os.Getenv("CF_INSTANCE_INDEX"),
			"proxy": "api-interop-golang",
		}
		if response["index"] == "" {
			response["index"] = "standalone"
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	mux.HandleFunc("/meta/alerts", func(w http.ResponseWriter, r *http.Request) {
		meta := data.GetMetaAlerts()
		response := map[string]interface{}{
			"data": meta,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	mux.HandleFunc("/county/", func(w http.ResponseWriter, r *http.Request) {
		fips := r.URL.Path[len("/county/"):]
		fips = strings.TrimSuffix(fips, "/")
		if len(fips) != 5 {
			http.Error(w, `{"error":"Invalid FIPS", "status": 404}`, http.StatusNotFound)
			return
		}

		countyData, err := data.GetCountyData(r.Context(), DBPool, fips)
		if err != nil {
			log.Printf("GetCountyData error: %v", err)
			http.Error(w, `{"error":"`+err.Error()+`", "status": 400}`, http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(countyData)
	})

	mux.HandleFunc("/products/afd/versions", func(w http.ResponseWriter, r *http.Request) {
		body, status, _ := data.GetAFDVersions()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		w.Write(body)
	})

	mux.HandleFunc("/products/afd/versions/", func(w http.ResponseWriter, r *http.Request) {
		wfo := r.URL.Path[len("/products/afd/versions/"):]
		if wfo == "" {
			http.Error(w, `{"error":"Missing WFO", "status": 404}`, http.StatusNotFound)
			return
		}
		body, status, _ := data.GetAFDVersionsByWFO(wfo)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		w.Write(body)
	})

	mux.HandleFunc("/point/", func(w http.ResponseWriter, r *http.Request) {
		pathArgs := r.URL.Path[len("/point/"):]
		
		var lat, lon float64
		// Parse /point/:lat/:lon
		_, err := fmt.Sscanf(pathArgs, "%f/%f", &lat, &lon)
		if err != nil {
			http.Error(w, `{"error":"Invalid Lat/Lon", "status": 404}`, http.StatusNotFound)
			return
		}

		pointData, err := data.GetPointData(r.Context(), DBPool, lat, lon)
		if err != nil {
			log.Printf("GetPointData error: %v", err)
			http.Error(w, `{"error":"`+err.Error()+`", "status": 400}`, http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(pointData)
	})

	log.Printf("Listening on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
