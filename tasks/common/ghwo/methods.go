package ghwo

import (
	"cmp"
	"math"
	"slices"
	"strconv"
)

/**
* Get a lookup mapping from risk keys to chicklet-style hazard data
 */
func (chickletData *SourceChicklet) GetRiskToHazardLookup() ChickletLookup {
	var lookup = make(ChickletLookup)

	for _, hazard := range chickletData.Hazards {
		riskKey, ok := RiskNameToKeyMap[hazard.Name]
		if ok {
			lookup[riskKey] = hazard
		}
	}

	return lookup
}

/**
* Merge source ghwo data for each locality (county or state) with metadata
* about each of the corresponding risks, and chunk the result by days.
* The timestamps in the source indicate which "days" there are.
* A RiskDay maintains the information from the source data about the
* risks for that day (like timestamp and basic risk level values), but for each risk we
* also add the legend metadata for the value, including levelname and definition.
*
* Additionally, this method calculates a "composite" value for risks for each day,
* representing the int for the highest risk that day, and a scaled version of the
* highest (since each risk can have a different scale).
*
* Finally, this method collects the canonical names of risks that have no positive
* risk level for all of the days (and therefore won't need to be displayed on the site).
* We remove all of these zero-level risks from each day, and return the list of names
* as part of the return value.
 */
func (s *SourceGHWOLocality) GetRiskDays(legend OutputSummaryLegend) ([]RiskDay, []string) {
	var days = make([]RiskDay, 0)

	for idx, localityData := range s.DataByTime {
		var riskDay = RiskDay{
			Timestamp: localityData.Timestamp,
			DayNumber: idx + 1,
			Risks:     make(map[RiskTypeKey]*OutputCategory),
		}

		// Loop through the RiskTypeKeys and the category values
		for riskTypeKey, categoryInt := range localityData.RiskLevels {
			if riskTypeKey == "DailyComposite" {
				continue
			}

			// Look up the category data from the processed
			// legend
			legendData, ok := legend[riskTypeKey]
			var usedLegend = false
			if ok {
				// If there is legend data, we use that
				// category structure found in the legend
				categoryKey := strconv.Itoa(categoryInt)
				categoryData, ok := legendData.Category[categoryKey]
				if ok {
					riskDay.Risks[riskTypeKey] = categoryData
					usedLegend = true
				}
			}

			if !usedLegend {
				// We didn't pull OutputCategory data from
				// the legend, perhaps indicating this is a risk type
				// the legend does not know about (data inconsistency)
				// We set a basic category struct in this case
				riskDay.Risks[riskTypeKey] = &OutputCategory{
					Category: categoryInt,
				}
			}
		}

		riskDay.ProcessCompositeFromLegend(legend)
		days = append(days, riskDay)
	}

	// Find all the risks that have no positive value for _all_ the days
	noRisks := GetNoRisksFromDays(days)

	// For each day, remove that risk if it is present
	for i := range days {
		day := days[i]
		for _, riskTypeKey := range noRisks {
			_, ok := day.Risks[riskTypeKey]
			if ok {
				delete(day.Risks, riskTypeKey)
			}
		}
	}

	// Get a list of the full risk names for the no risks
	var noRiskNames = make([]string, 0)
	for _, riskKey := range noRisks {
		name, ok := KeyToRiskNameMapping[riskKey]
		if !ok {
			name = riskKey
		}
		noRiskNames = append(
			noRiskNames,
			name,
		)
	}

	// Because the original incoming JSON objects have timestamps for keys
	// that are in order, and because go maps cannot guarantee an order based
	// on keys, we need to sort the final array of days by the Timestamp
	slices.SortFunc(days, func(a, b RiskDay) int {
		return cmp.Compare(a.Timestamp, b.Timestamp)
	})

	// Now we need to update the DayNumber for each based on the
	// new sorting
	for i := range days {
		days[i].DayNumber = i + 1
	}

	return days, noRiskNames
}

/**
* Calculate and set the Compite for the RiskDay.
* A "composite" is a struct representing the max risk value
* for the given day (Max) and also a scaled value,
* since each risk category can have a different scale
* (some are 3 levels, 4 levels, etc, etc)
* This method modifies the day in place.
 */
func (day *RiskDay) ProcessCompositeFromLegend(legend OutputSummaryLegend) {
	var scaledValues []float64
	var categoryValues []int

	for riskTypeKey, category := range day.Risks {
		var max = 5
		legendData, ok := legend[riskTypeKey]
		if ok {
			max = legendData.Scale
		}

		categoryValues = append(
			categoryValues,
			category.Category,
		)

		scaledValues = append(
			scaledValues,
			float64(category.Category)/float64(max),
		)
	}

	if len(categoryValues) == 0 {
		day.Composite.Max = 0
		day.Composite.Scaled = 0.0
	} else {
		day.Composite.Max = slices.Max(categoryValues)
		day.Composite.Scaled = math.Round(slices.Max(scaledValues)*100) / 100
	}
}

/**
 * Transform a SourceCategory to a new OutputCategory.
* Note that we set the Category value to 0, so callers will need
* to update those to the correct value
*/
func (category *SourceCategory) ToOutputCategory() *OutputCategory {
	return &OutputCategory{
		Color:      category.Color,
		Definition: category.Definition,
		LevelName:  category.LevelName,
		Category:   0,
	}
}

/**
* Get a lookup dictionary/map for the legend that is easier to work with
* and process.
* See inline comments for further details.
 */
func (sourceLegend *SourceLegend) ProcessOutputLegend() OutputSummaryLegend {
	var result = make(OutputSummaryLegend)
	// We need to map the risk names from the legend into the risk keys in
	// the actual data. We have a mapping that covers all the risks we know
	// about right now, but as a stopgap for risks we don't know about, we
	// will try to convert hazard names into keys based on how it tends to go.
	//
	// We have asked GHWO to add this mapping into the legend metadata
	// for us, so hopefully we can switch over to that before long.
	for _, hazard := range sourceLegend.Hazards {

		// Create a new hazard/risk entry of the output type
		// and add to the result legend by the found riskKey
		riskKey := getNormalizedHazardName(hazard.Name)
		riskEntry := OutputLegend{
			Name:     hazard.Name,
			Category: SourceToOutputCategoryDict(hazard.SourceCategoryDict),
		}

		// Grab the risk "scale", which is basically the number of levels
		// in its category dictionary
		riskEntry.Scale = GetMaxIntegerFromKeys(riskEntry.Category)

		// This is ugly. Let me explain. And then you will agree it is ugly
		// and you will be sad but hopefully you will at least understand.
		// Maybe you will know a better way.
		//
		// When we reach this point, the legend object looks like this:
		//
		// {
		//   risk_key_1: {
		//     name: "Risk #1",
		//     category: {
		//       "0": {
		//          color: "blue",
		//          definition: "sad",
		//          levelName: "ba-da-be-da",
		//        },
		//       "1": {
		//          color: "yellow",
		//          definition: "happy",
		//          levelName: "I'm so",
		//        },
		//       "2": {
		//          color: "red",
		//          definition: "corvette",
		//          levelName: "Prince",
		//        },
		//     }
		//   }
		// }
		//
		// What we need to do is add the category number, currently expressed
		// as the key in the `category` object, as a property as well. That is,
		// category 0 becomes this:
		//
		// category: {
		//   "0": {
		//     color: "blue",
		//     definition: "sad",
		//     levelName: "ba-da-be-da",
		//     category: 0,         <--- this one is new, compared to above
		//   }
		// }
		//
		// So we use this funky object value iteration. The key is the
		// numeric category (though, in fact, expressed as a string), and the
		// value is the category legend data. And we can smoosh those together.
		for categoryKey, categoryData := range riskEntry.Category {
			// Convert the key, which is a string representation of an
			// int, into an actual int
			categoryInt, err := strconv.Atoi(categoryKey)
			if err != nil {
				categoryInt = 0
			}
			categoryData.Category = categoryInt

			// If there is not a valid level name in the category data,
			// we attempt to pull if from the fallback set
			if categoryData.LevelName == "" {
				categoryData.LevelName = GetFallbackLevelName(
					categoryInt,
					riskEntry.Scale,
				)
			}
		}
		result[riskKey] = &riskEntry
	}

	return result
}

/**
 * Using processed legend, chicklet, and RiskDay data,
* create the "top level" dictionary/map of risk information that will be present
* on the output, as well as a top-level representation of the legend.
* The uses of these top level versions by consumers of the output (ie website) are:
* Risks map - consumers can lookup an individual risk and get all RiskDays for that risk
* Legend - We can display the full legend for each risk on the site, like a true
* graph legend
*/
func (s *Output) AddTopLevelRisksAndLegend(wfo string, days []RiskDay, legend OutputSummaryLegend, chicklet ChickletLookup) {
	// Initialize the lookup map
	s.Risks = make(map[RiskTypeKey]*OutputRisk)

	// We will populate a top-level mapping of legend data
	// for each risk
	var dataLegend = make(OutputSummaryLegend)

	// All days should already have the same risks,
	// so we can use the first day to simply collect the risk keys
	for riskTypeKey, _ := range days[0].Risks {
		var outputRisk = OutputRisk{}

		// Try to determine the risk name from the legend.
		// If we can't, we use the key itself.
		legendRisk, legendRiskOk := legend[riskTypeKey]
		if legendRiskOk {
			outputRisk.Name = legendRisk.Name
			outputRisk.Legend = legendRisk
			dataLegend[riskTypeKey] = legendRisk
		}
		if outputRisk.Name == "" {
			outputRisk.Name = riskTypeKey
		}

		// Loop through each day and add a new
		// ExtendedOutputCategory for each day, based
		// on the current category
		for _, day := range days {
			outputCategory, ok := day.Risks[riskTypeKey]
			if ok {
				extendedCategory := getExtendedOutputCategory(
					outputCategory,
					riskTypeKey,
					day,
					wfo,
					chicklet,
				)

				outputRisk.Days = append(
					outputRisk.Days,
					extendedCategory,
				)
			}
		}

		s.Risks[riskTypeKey] = &outputRisk
	}

	// Add the top level legend to the struct
	s.Legend = dataLegend
}

/**
* Add a top level composite to the output.
* This is a Max and Scaled value that applies across all days
* and all risks in the source data.
* It is used for creating the GHWO summary table that appears on
* the site (as opposed to the interactive detailed table with chicklets)
 */
func (s *Output) ProcessComposite() {
	for i := range s.Days {
		day := s.Days[i]
		extendedComposite := ExtendedRiskDayComposite{
			Max:       day.Composite.Max,
			Scaled:    day.Composite.Scaled,
			Timestamp: day.Timestamp,
		}
		s.Composite.Days = append(
			s.Composite.Days,
			extendedComposite,
		)
	}
}
