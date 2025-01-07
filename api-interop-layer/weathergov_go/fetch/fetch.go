package fetch

import (
	"net/http"
//	"io/ioutil"
	"log"
	"encoding/json"
	"fmt"
//	"crypto/sha256"
	//	"encoding/base64"
//	"strings"
	"weathergov/alerts/events"
)

const AlertsEndpoint = "https://api.weather.gov/alerts/active?status=actual"

// Alert types
type AlertFeature struct {
	Properties AlertProperties `json:"properties"`
}

type AlertProperties struct {
	Id string `json:"id"`
	Event string `json:"event"`
	Sent string `json:"sent"`
	Effective string `json:"effective"`
	Onset string `json:"onset"`
	Expires string `json:"expires"`
	Ends string `json:"ends"`
	Status string `json:"status"`
	Headline string `json:"headline"`
	Description string `json:"description"`
	MessageType string `json:"messageType"`
}

type AlertResponse struct {
	Updated string `json:"updated"`
	Context string `json:"@context"`
	Type string `json:"type"`
	Title string `json:"title"`
	Features []AlertFeature `json:"features"`
}

func FetchAlerts() []AlertFeature {
	resp, err := http.Get(AlertsEndpoint)
	if(err != nil){
		log.Fatal(err)
	}

	defer resp.Body.Close()

	var alertResponse AlertResponse
	json.NewDecoder(resp.Body).Decode(&alertResponse)

	numFeatures := len(alertResponse.Features)
	result := make([]AlertFeature, 0)

	for i := 0; i < numFeatures; i++ {
		alertKind, ok := events.GetAlertType(
			alertResponse.Features[i].Properties.Event,
		)
		if(ok){
			if(alertKind.Kind == "land"){
				result = append(result, alertResponse.Features[i])
			}
		}
	}

	fmt.Printf("%d total alerts\n", len(alertResponse.Features))
	fmt.Printf("%d land alerts\n", len(result))

	return result
}
