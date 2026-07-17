package ghwo

import (
	"fmt"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

// A compiled regular expression for finding timestamps
var GHWOTimestampRegex = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([-+]\d{2}:\d{2}|[zZ])$`)

// A compiled regex that will serve to replace hazard name strings
// Note: the JS version of this code had the following (cryptic) line, whose
// regex use case is unclear:
//
//	hazard.name.replace(/ Risk$/, "").replace(/[^a-z]/gi, "");
var HazardReplacementRegexRisk = regexp.MustCompile(` Risk$`)
var HazardReplacementRegexNonLetter = regexp.MustCompile(`[^a-zA-z]`)

/* Helper functions for processing */

/**
 * For a given risk factor, peek into the legend and determine
 * what its "scale" is. The scale is defined as the number of
 * category/levels that the risk factor can have.
 * We discount level 0 from this accounting.
 * So far, we have only seen 2, 3, 4, and 5 level scales.
 * Note: We have encountered Rip Current Risk, which has categories
 * 0, 2, and 3 (note that 1 doesn't exist), making it effecively a 2-scale, but we need to treat it as a 3 point scale for procesing purposes
 */
func GetMaxIntegerFromKeys(dict map[string]*OutputCategory) int {
	var keysAsIntegers []int

	for key, _ := range dict {
		i, err := strconv.Atoi(key)
		if err == nil {
			keysAsIntegers = append(keysAsIntegers, i)
		}

	}

	if len(keysAsIntegers) == 0 {
		return -1
	}

	return slices.Max(keysAsIntegers)
}

/**
* Get a normalized image url for the given hazard
* in the chicklet data.
* There are two ways to attempt to get an image URL:
* (1) From the processed chicklet data, which should work
* in almost all cases;
* (2) By using our risk key to image name lookup mapping
* and composing the URL ourselves (see mappings.js)
* This function attempts method (1) first, then (2) as
* the backup.
 */
func GetImageURLForRiskInChicklet(riskKey RiskTypeKey, dayNumber int, wfo string, chickletLookup ChickletLookup) string {
	// Our first stratefgy is to check the chicklet data for any matching
	// information about risks from the provided chicklet lookup map
	foundRisk, ok := chickletLookup[riskKey]
	if ok {
		// If we get here, we have the chicklet version of hazard
		// data for the given RiskTypeKey. This means we can attempt
		// to pull out the image URLs.
		periodKey := fmt.Sprintf("period%d", dayNumber)
		period, ok := foundRisk.Periods[periodKey]
		if ok {
			if strings.HasPrefix(period.ImagePath, "http") {
				return period.ImagePath
			}

			return fmt.Sprintf("https://www.weather.gov%s", period.ImagePath)
		}
	}

	// Otherwise, we attempt to construct the image path ourselves
	// using the existing risk name to image mapping in our
	// mappings set
	riskName, ok := RiskNameToImageMap[riskKey]
	if !ok {
		riskName = riskKey
	}
	return fmt.Sprintf("https://www.weather.gov/images/%s/ghwo/%sDay%d.jpg", wfo, riskName, dayNumber)
}

/**
* See the method ProcessOutputLegend
 */
func SourceToOutputCategoryDict(sourceDict SourceCategoryDict) map[RiskTypeKey]*OutputCategory {
	var result = make(map[RiskTypeKey]*OutputCategory)

	for key, sourceCategory := range sourceDict {
		result[key] = sourceCategory.ToOutputCategory()
	}

	return result
}

/**
* Safety method for getting a RiskTypeKey from a full risk name.
* Will attempt to compose the key from the full name if it is not in our
* lookup.
 */
func getNormalizedHazardName(hazardName string) RiskTypeKey {
	mappedName, ok := RiskNameToKeyMap[hazardName]
	if ok {
		return mappedName
	}

	result := HazardReplacementRegexRisk.ReplaceAllString(hazardName, "")
	return HazardReplacementRegexNonLetter.ReplaceAllString(result, "")
}

// Transform a regular OutputCategory struct into the Extended version
// using day and chicklet information
func getExtendedOutputCategory(c *OutputCategory, riskKey RiskTypeKey, day RiskDay, wfo string, chicklet ChickletLookup) ExtendedOutputCategory {
	return ExtendedOutputCategory{
		Color:      c.Color,
		Definition: c.Definition,
		LevelName:  c.LevelName,
		Category:   c.Category,
		Image: GetImageURLForRiskInChicklet(
			riskKey,
			day.DayNumber,
			wfo,
			chicklet,
		),
		Timestamp: day.Timestamp,
	}
}

/**
 * For a list of RiskDays, return a list of RiskTypeKeys for
 * risks that have a category value of 0 across _all_ days
 */
func GetNoRisksFromDays(riskDays []RiskDay) []string {
	var actualRisksSet = make(map[string]struct{})
	var noRisksSet = make(map[string]struct{})

	for _, day := range riskDays {
		for riskTypeKey, category := range day.Risks {
			noRisksSet[riskTypeKey] = struct{}{}
			if category.Category > 0 {
				actualRisksSet[riskTypeKey] = struct{}{}
			}
		}
	}

	// Now loop through all the no-risk keys and,
	// if they are present in the actual risk set, remove
	// from the no risk set
	for noRiskKey, _ := range noRisksSet {
		_, isActual := actualRisksSet[noRiskKey]
		if isActual {
			delete(noRisksSet, noRiskKey)
		}
	}

	// Return an array of the riskTypeKeys corresponding
	// to risks that have no positive value for the whole day
	var result = make([]string, 0)
	for riskTypeKey, _ := range noRisksSet {
		result = append(result, riskTypeKey)
	}
	return result
}
