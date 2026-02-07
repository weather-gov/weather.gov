package data

type CountyResult struct {
	County       CountyInfo         `json:"county"`
	RiskOverview RiskOverviewResult `json:"riskOverview"`
	Alerts       *AlertsResponse    `json:"alerts"`
	AlertDays    []AlertDay         `json:"alertDays"`
	Error        string             `json:"error,omitempty"`
	Status       int                `json:"status,omitempty"`
}

type CountyInfo struct {
	State      string      `json:"state"`
	County     string      `json:"county"`
	PrimaryWFO string      `json:"primarywfo"`
	Timezone   string      `json:"timezone"`
	Shape      interface{} `json:"shape"`
	StateName  string      `json:"statename"`

	// FIPS added in processing
	CountyFIPS string `json:"countyfips"`
	StateFIPS  string `json:"statefips"`
}

type AlertDay struct {
	Start  string `json:"start"` // ISO/String
	End    string `json:"end"`
	Day    string `json:"day"`    // Name (Monday)
	Alerts []int  `json:"alerts"` // Indices of alerts
}
