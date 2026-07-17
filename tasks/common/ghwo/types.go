package ghwo

import (
	"encoding/json"
	"fmt"
)

/* General type aliases */

// A string that represents a timestamp
type Timestamp = string

// A string that represents either a state code or a county FIPS
type LocalityCode = string

// A string that represents a risk type key,
// such as "ExcessiveRainfall" or "NonConvectiveWind"
type RiskTypeKey = string

// A string that represents the string version of an
// in that serves as the category numerical key in
// legend data.
// For example:
//
//	"category": {
//	  "0": { <--- __This is the CategoryKey string__
//	    "color": "#ededed",
//	    "definition": "No Severe Thunderstorm Risk",
//	    "levelName": "None"
//	  },
//	  "1": {
//	    "color": "#50c986",
//	    "definition": "Isolated severe thunderstorms possible.",
//	    "levelName": "Marginal"
//	  },
//	}
type CategoryKey = string

// A string that represents a period key in the source chicklet data.
// Period keys are of the form "Period<int>" where <int> is
// the 1-index of the period.
// Example:
//
//	"periods": {
//	  "period1": { <-- __This is the PeriodKey__
//	    "color": "#ededed",
//	    "date": "Tuesday, July 14, 2026",
//	    "imagePath": "/images/lwx/ghwo/SevereThunderstormsDay1.jpg",
//	    "validStartTime": "09:00AM"
//	  },
//	  "period2": {
//	    "color": "#ededed",
//	    "date": "Wednesday, July 15, 2026",
//	    "imagePath": "/images/lwx/ghwo/SevereThunderstormsDay2.jpg",
//	    "validStartTime": "08:00AM"
//	  },
//	}
type PeriodKey = string

/* legend related structs */

/**
* Information about a given risk level, as it appears in
* both the source legend information (legend.json files)
* and in interim processed data.
* The output uses variants of this struct called
* OutputCategory and ExtendedOutputCategory
*
* Example from source legend.json:
* {
*   "color": "#ededed",
*   "definition": "No Severe Thunderstorm Risk",
*   "levelName": "None"
* }
 */
type SourceCategory struct {
	Color      string `json:"color,omitempty"`
	Definition string `json:"definition,omitempty"`
	LevelName  string `json:"levelName,omitempty"`
}

/**
* A map/dict that maps CategoryKeys, which are string representations
* of integers which themselves correspond to risk levels, to actual category
* data entries.
* Note the weirdness of having string-ints for keys that are themselves
* meant to be computed -- this will play a role in data processing.
* Example from source legend.json
* {
*     "0": {
*       "color": "#ededed",
*       "definition": "No Severe Thunderstorm Risk",
*       "levelName": "None"
*     },
*  }
 */
type SourceCategoryDict = map[CategoryKey]SourceCategory

/**
* A hazard object, as it would appear in the source legend.json data
* Example from source legend.json:
* {
*   "category": {
*     "0": {
*       "color": "#ededed",
*       "definition": "No Severe Thunderstorm Risk",
*       "levelName": "None"
*     },
*     "1": {
*       "color": "#50c986",
*       "definition": "Isolated severe thunderstorms possible.",
*       "levelName": "Marginal"
*     }
*   "name": "Severe Thunderstorm Risk",
*   "webTab": "public"
* }
 */
type SourceLegendHazard struct {
	SourceCategoryDict `json:"category"`
	Name               string `json:"name"`
	Webtab             string `json:"webTab"`
}

/**
* Struct representation of GHWO legend source metadata.
* For an example, see:
* www.weather.gov/source/lwx/ghwo/legend.json
 */
type SourceLegend struct {
	GenerationTime   string               `json:"generation_time,omitempty"`
	GenerationTimeLt string               `json:"generation_time_LT,omitempty"`
	GhwoVersion      string               `json:"ghwo_version,omitempty"`
	Hazards          []SourceLegendHazard `json:"hazards"`
	SwitchoverHour   string               `json:"switchover_hour,omitempty"`
}

/* Chicklet related structs */

/**
* Representation of a "period" as it appears in source chicklet.json
* data. A "period" is represented as a dict/map in the source, whose
* outer key is a string of type PeriodKey (see comment for that above)
* Example source:
* {
*   "color": "#ededed",
*   "date": "Friday, July 17, 2026",
*   "imagePath": "/images/lwx/ghwo/SevereThunderstormsDay1.jpg",
*   "validStartTime": "11:00AM"
* }
 */
type SourceChickletHazardPeriod struct {
	Color          string `json:"color,omitempty"`
	Date           string `json:"date,omitempty"`
	ImagePath      string `json:"imagePath,omitempty"`
	ValidStartTime string `json:"validStartTime,omitempty"`
}

/**
* Uses the PeriodKey string type, which is a string with a number
* in it indicating the index-1 of the period, (example: "period3")
* This is an awkward structure of the source data, where an ordered array
* would fit better, but we will deal with it as-is.
* Example from source chicklet.json:
* {
*   "period1": {
*     "color": "#ededed",
*     "date": "Friday, July 17, 2026",
*     "imagePath": "/images/lwx/ghwo/SevereThunderstormsDay1.jpg",
*     "validStartTime": "11:00AM"
*   }
* }
 */
type SourceChickletHazardPeriods map[PeriodKey]SourceChickletHazardPeriod

/**
* Chicklet representation of hazard metadata for each period.
* Example from source chicklet.json:
* {
*   "description": "Utilizes <a href='https:*www.spc.noaa.gov/products/outlook/' target='_blank'>daily forecasts</a> from the Storm Prediction Center (SPC). <a href='https:*www.spc.noaa.gov/misc/about.html' target='_blank'>More info</a>",
*   "name": "Severe Thunderstorm Risk",
*   "periods": {
*     // etc etc
*     "period3": {
*       "color": "#ededed",
*       "date": "Sunday, July 19, 2026",
*       "imagePath": "/images/lwx/ghwo/SevereThunderstormsDay3.jpg",
*       "validStartTime": "08:00AM"
*     },
*     // etc etc
*     "webTab": "public"
*   }
* }
 */
type SourceChickletHazard struct {
	Description string                      `json:"description,omitempty"`
	Name        string                      `json:"name,omitempty"`
	Periods     SourceChickletHazardPeriods `json:"periods,omitempty"`
	Webtab      string                      `json:"webTab,omitempty"`
}

/**
* Struct representation of GHWO Chicklet data.
* For an example of the source JSON structure, visit
* https://www.weather.gov/source/lwx/ghwo/chicklet.json
 */
type SourceChicklet struct {
	GenerationTime   string                 `json:"generation_time,omitempty"`
	GenerationTimeLt string                 `json:"generation_time_LT,omitempty"`
	GhwoVersion      string                 `json:"ghwo_version,omitempty"`
	Hazards          []SourceChickletHazard `json:"hazards,omitempty"`
	SwitchoverHour   string                 `json:"switchover_hour,omitempty"`
}

/* hazByCounty.json based structs */

/**
* A modified representation of risk keys to category (int) values
* as would appear for any county or state entry in a hazByCounty.json
* source file.
* Example:
*  {
*   "countyName": "DC_District of Columbia",
*   "2026-07-17T10:00:00-04:00": {
*     "SevereThunderstorm": 0,
*     "Tornado": 0,
*     "ConvectiveWind": 0,
*     "Hail": 0,
*     "Lightning": 1,
*     "ExcessiveRainfall": 0,
*     "ExtremeHeat": 0,
*     "NonConvectiveWind": 0,
*     "Fog": 0,
*     "FireWeather": 0,
*     "CoastalFlood": 0,
*     "Marine": 0,
*     "DailyComposite": 1
*   },
*    //etc etc
* }
* However, since the timetamps-as-keys presents a problem
* (especially when combined with non-timestamp keys, like countyName),
* this struct serves as a kind of interim format, which can be used with custom
* marshal and unmarshal methods below.
* _If_ it was serialized to JSON, it would look like:
* {
*   "countyName": "DC_District of Columbia",
*   "dataByTime": [
*       <SourceGHWOLocalityData> (See below)
*   ]
* }
 */
type SourceGHWOLocality struct {
	CountyName string                   `json:"countyName"`
	DataByTime []SourceGHWOLocalityData `json:"dataByTime"`
}

/**
* A modified version of hazByCounty.json risk keys to categories
* where the timestamps -- which in the source data are keys -- are represented
* as a value, along with a map/dict of the risk keys/vals.
* In short, it translates this kind of structure:
*  "2026-07-17T10:00:00-04:00": {
*     "SevereThunderstorm": 0,
*     "Tornado": 0,
*     "ConvectiveWind": 0,
*     "Hail": 0,
*     "Lightning": 1,
*     "ExcessiveRainfall": 0,
*     "ExtremeHeat": 0,
*     "NonConvectiveWind": 0,
*     "Fog": 0,
*     "FireWeather": 0,
*     "CoastalFlood": 0,
*     "Marine": 0,
*     "DailyComposite": 1
*   }
* To a struct whose JSON serialized representation would look like:
* {
*   "timestamp": "2026-07-17T10:00:00-04:00",
*   "riskLevels": {
*     "SevereThunderstorm": 0,
*     "Tornado": 0,
*     "ConvectiveWind": 0,
*     "Hail": 0,
*     "Lightning": 1,
*     "ExcessiveRainfall": 0,
*     "ExtremeHeat": 0,
*     "NonConvectiveWind": 0,
*     "Fog": 0,
*     "FireWeather": 0,
*     "CoastalFlood": 0,
*     "Marine": 0,
*     "DailyComposite": 1
*   }
* }
 */
type SourceGHWOLocalityData struct {
	Timestamp  Timestamp           `json:"timestamp"`
	RiskLevels map[RiskTypeKey]int `json:"riskLevels"`
}

/**
* Custom marshal/unmarshal methods for SourceGHWOLocality
* and by extension SourceGHWOLocalityData.
* These methods deserialize/serialize the complex source structure
* present in hazByCounty.json data into a more useable form represented
* by these two structs.
* See the comments for the structs for a clearer picture of the data
* transformation.
 */
func (s *SourceGHWOLocality) UnmarshalJSON(bytes []byte) error {
	var data map[string]interface{}

	err := json.Unmarshal(bytes, &data)
	if err != nil {
		return fmt.Errorf("Could not unmarshal SourceGHWOLocalityData: %w", err)
	}

	for key, val := range data {
		if key == "countyName" {
			s.CountyName = val.(string)
		} else {
			// Otherwise, the key is a timestamp, and we need to append
			// its data to the DataByTime array
			countyData := SourceGHWOLocalityData{
				Timestamp: key,
			}

			// We need to loop through the keys and values in
			// the RiskLevels map and populate with the correct type
			riskLevels := make(map[RiskTypeKey]int)
			for riskTypeKey, level := range val.(map[string]interface{}) {
				riskLevels[riskTypeKey] = int(level.(float64))
			}
			countyData.RiskLevels = riskLevels
			s.DataByTime = append(s.DataByTime, countyData)
		}
	}

	return nil
}

func (s *SourceGHWOLocality) MarshalJSON() ([]byte, error) {
	var result = make(map[string]any)
	result["countyName"] = s.CountyName
	for _, countyData := range s.DataByTime {
		result[countyData.Timestamp] = countyData.RiskLevels
	}

	return json.Marshal(&result)
}

type SourceGHWOLocalities map[LocalityCode]SourceGHWOLocality

/* Interim structs, used for processing */

/**
* A mapping of normalized RiskTypeKey names
 */
type ChickletLookup map[RiskTypeKey]SourceChickletHazard

/**
* Struct representation of hazByCounty.json source data
* This is the primary data source for actual GHWO information
* For an example, visit:
* https://www.weather.gov/source/lwx/ghwo/hazByCounty.json
 */
type SourceGHWOData struct {
	WFO            string               `json:"wfo"`
	Counties       SourceGHWOLocalities `json:"counties"`
	GenerationTime string               `json:"generation_time,omitempty"`
	States         SourceGHWOLocalities `json:"states"`
}

/* Output structs */

type OutputCategory struct {
	Color      string `json:"color,omitempty"`
	Definition string `json:"definition,omitempty"`
	LevelName  string `json:"levelName,omitempty"`
	Category   int    `json:"category"`
}

type ExtendedOutputCategory struct {
	Color      string    `json:"color,omitempty"`
	Definition string    `json:"definition,omitempty"`
	LevelName  string    `json:"levelName,omitempty"`
	Category   int       `json:"category"`
	Image      string    `json:"image"`
	Timestamp  Timestamp `json:"timestamp"`
}

type RiskDayComposite struct {
	Max    int     `json:"max"`
	Scaled float64 `json:"scaled"`
}

type ExtendedRiskDayComposite struct {
	Max       int       `json:"max"`
	Scaled    float64   `json:"scaled"`
	Timestamp Timestamp `json:"timestamp"`
}

type RiskDay struct {
	Risks     map[RiskTypeKey]*OutputCategory `json:"risks"`
	Composite RiskDayComposite                `json:"composite"`
	DayNumber int                             `json:"dayNumber"`
	Timestamp Timestamp                       `json:"timestamp"`
}

type OutputLegend struct {
	Name     string                          `json:"name"`
	Scale    int                             `json:"scale"`
	Category map[CategoryKey]*OutputCategory `json:"category"`
}

type OutputRisk struct {
	Days   []ExtendedOutputCategory `json:"days"`
	Name   string                   `json:"name"`
	Legend *OutputLegend            `json:"legend"`
}

type OutputSummaryLegend map[RiskTypeKey]*OutputLegend

/**
* Struct representation of the overall output data.
* This is the output data that is serialized into JSON,
* stored into the database, and when requested
* retrieved from the database on the Django side
* as GHWO data for the given state or county.
 */
type Output struct {
	WFO       string                      `json:"wfo"`
	Days      []RiskDay                   `json:"days"`
	Risks     map[RiskTypeKey]*OutputRisk `json:"risks"`
	Legend    OutputSummaryLegend         `json:"legend"`
	IsState   bool                        `json:"isState"`
	IsCounty  bool                        `json:"isCounty"`
	Fips      LocalityCode                `json:"fips"`
	State     LocalityCode                `json:"state,omitempty"`
	NoRisks   []string                    `json:"noRisks"`
	Composite struct {
		Days []ExtendedRiskDayComposite `json:"days"`
	} `json:"composite"`
}
