package data

import (
	"encoding/json"
	"time"
)

type ForecastPeriod struct {
	StartTime                  string `json:"startTime"`
	EndTime                    string `json:"endTime"`
	IsDaytime                  bool   `json:"isDaytime"`
	Temperature                int    `json:"temperature"`
	TemperatureUnit            string `json:"temperatureUnit"` // "F", "C"
	TemperatureTrend           string `json:"temperatureTrend,omitempty"`
	WindSpeed                  string `json:"windSpeed"` // "10 mph"
	WindDirection              string `json:"windDirection"`
	Icon                       string `json:"icon"`
	ShortForecast              string `json:"shortForecast"`
	DetailedForecast           string `json:"detailedForecast"`
	ProbabilityOfPrecipitation struct {
		UnitCode string `json:"unitCode"`
		Value    int    `json:"value"`
	} `json:"probabilityOfPrecipitation"`
}

type ForecastDailyProperties struct {
	Periods   []ForecastPeriod `json:"periods"`
	Elevation struct {
		UnitCode string  `json:"unitCode"`
		Value    float64 `json:"value"`
	} `json:"elevation,omitempty"`
	GeneratedAt string `json:"generatedAt"`
	UpdateTime  string `json:"updateTime"`
	ValidTimes  string `json:"validTimes"`
}

type ForecastDailyResponse struct {
	Properties ForecastDailyProperties `json:"properties"`
	Error      bool                    `json:"error,omitempty"`
}

// Gridpoint structures can be generic since they iterate keys,
// but we might want typed structs for known keys like 'quantitativePrecipitation'.

type GridpointValue struct {
	ValidTime string  `json:"validTime"` // "ISO/ISO_DURATION"
	Value     float64 `json:"value"`
}

type GridpointProperty struct {
	Uom    string           `json:"uom"`
	Values []GridpointValue `json:"values"`
}

type GridpointProperties struct {
	QuantitativePrecipitation *GridpointProperty `json:"quantitativePrecipitation,omitempty"`
	IceAccumulation           *GridpointProperty `json:"iceAccumulation,omitempty"`
	SnowfallAmount            *GridpointProperty `json:"snowfallAmount,omitempty"`
	// Others like temperature, windSpeed etc. are dynamic
	// We can use map[string]interface{} for dynamic iteration, or a custom unmarshal.
	// given TS iterates `Object.keys`, using a map is best for the catch-all.
	Raw map[string]json.RawMessage
}

type GridpointResponse struct {
	Properties map[string]json.RawMessage `json:"properties"`
	Geometry   interface{}                `json:"geometry"`
	Error      bool                       `json:"error,omitempty"`
}

// Intermediate Structures for internal processing
type ForecastDay struct {
	Start   string      `json:"start"`
	End     string      `json:"end"`
	Periods []DayPeriod `json:"periods"`
	Hours   []HourData  `json:"hours,omitempty"`
	MaxPop  int         `json:"maxPop"`
	QPF     *DayQPF     `json:"qpf,omitempty"`
}

type DayPeriod struct {
	Start       string                 `json:"start"`
	End         string                 `json:"end"`
	IsDaytime   bool                   `json:"isDaytime"`
	IsOvernight bool                   `json:"isOvernight"`
	Data        map[string]interface{} `json:"data"` // Converted properties
}

type HourData struct {
	Time time.Time `json:"time"`
	// Properties like 'temperature', 'windSpeed', etc.
	// In TS they put everything on the object.
	Properties map[string]interface{}
}

type DayQPF struct {
	Periods []map[string]interface{} `json:"periods"`
	HasIce  bool                     `json:"hasIce"`
	HasSnow bool                     `json:"hasSnow"`
	HasQPF  bool                     `json:"hasQPF"`
}
