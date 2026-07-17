package ghwo

import (
	"fmt"
	"strings"
)

var LevelNames = map[int][]string{
	5: []string{"None", "Very Low", "Low", "Moderate", "High", "Very High"},
	4: []string{"None", "Very Low", "Low", "High", "Very High"},
	3: []string{"None", "Low", "Moderate", "High"},
	2: []string{"None", "Moderate", "High"},
}

// Generally, hazard outlook image URLs use the same risk names as the data
// but in a few cases, they do not. This is a mapping for those outliers
var RiskNameToImageMap = map[string]string{
	"ConvectiveWind":     "ThunderstormWind",
	"Frost/Freeze":       "FrostFreeze",
	"Marine":             "MarineHazard",
	"NonConvectiveWind":  "Wind",
	"SevereThunderstorm": "SevereThunderstorms",
	"FireWeatherGFDI":    "FireWxGFDI",
}

var RiskNameToKeyMap = map[string]string{
	"Blowing Dust Risk":                  "BlowingDust",
	"Blowing Snow":                       "BlowingSnow",
	"Coastal Flood Risk":                 "CoastalFlood",
	"Thunderstorm Wind Risk":             "ConvectiveWind",
	"Excessive Rainfall Risk":            "ExcessiveRainfall",
	"Extreme Cold Risk":                  "ExtremeCold",
	"Extreme Heat Risk":                  "ExtremeHeat",
	"Fire Risk":                          "ghwoFireRiskCat",
	"Fire Weather Risk":                  "FireWeather",
	"Fog Risk":                           "Fog",
	"Freezing Spray Risk":                "FreezingSpray",
	"Frost/Freeze Risk":                  "Frost/Freeze",
	"Grassland Fire Danger Index (GFDI)": "FireWeatherGFDI",
	"Hail Risk":                          "Hail",
	"High Surf Risk":                     "HighSurf",
	"Ice Accumulation Risk":              "IceAccumulation",
	"Lakeshore Flood Risk":               "LakeshoreFlood",
	"Lightning Risk":                     "Lightning",
	"Marine Hazard Risk":                 "Marine",
	"Maximum WBGT Risk":                  "MaxWBGTRisk",
	"Wind Risk":                          "NonConvectiveWind",
	"Rip Current Risk":                   "RipRisk",
	"Severe Thunderstorm Risk":           "SevereThunderstorm",
	"Snow/Sleet Risk":                    "SnowSleet",
	"Spotter Outlook":                    "SpotterOutlook",
	"Swim Risk":                          "SwimRisk",
	"Tornado Risk":                       "Tornado",
	"Waterspout Risk":                    "Waterspout",
}

// Maps the canonical 2 or 3 letter state/territory
// abbreviates code to the name of the state as used
// in the state-level GHWO legend and chicklet filenames.
// For example, `chickletSouth_Dakota.json` or
// `legendNY.json`
var StateAbbrevToLegendKeyMap = map[string]string{
	"VA": "Virginia",
	"NY": "NY",
	"MA": "MA",
	"RI": "RI",
	"CT": "CT",
	"SC": "SC",
	"PA": "PA",
	"ME": "Maine",
	"NH": "NewHampshire",
	"OH": "Ohio",
	"MD": "Maryland",
	"WV": "WV",
	"SD": "South_Dakota",
	"WY": "WY",
	"IL": "Illinois",
	"IN": "Indiana",
	"MO": "Missouri",
	"WI": "Wisconsin",
	"MN": "MN",
	"AL": "Alabama",
	"GA": "GA",
	"LA": "Louisiana",
	"TN": "Tennessee",
	"OK": "OK",
	"AZ": "Arizona",
}

/**
* Respond with the string of the fallback levelName
* for the given level number at the corresponding scale
* (2-level, 3-leve scales, etc)
 */
func GetFallbackLevelName(levelNum int, scale int) string {
	levelScale, hasScale := LevelNames[scale]
	if hasScale && levelNum < len(levelScale) {
		return LevelNames[scale][levelNum]
	}
	return fmt.Sprintf("Level %d of %d", levelNum, scale)
}

func GetStateDataViewName(stateCode string) string {
	name, ok := StateAbbrevToLegendKeyMap[strings.ToUpper(stateCode)]
	if !ok {
		return ""
	}
	return name
}

// Create the reverse lookup mapping from key
// names to full risk names
var KeyToRiskNameMapping = createReverseMapping(RiskNameToKeyMap)

func createReverseMapping(m map[string]string) map[string]string {
	out := make(map[string]string, len(m))
	for key, val := range m {
		out[val] = key
	}
	return out
}
