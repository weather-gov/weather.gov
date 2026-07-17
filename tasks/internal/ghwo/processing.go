package ghwo

import "fmt"

func GetProcessedCounty(countyFips string, ghwoData *SourceGHWOData, legend OutputSummaryLegend, chicklet ChickletLookup) *Output {
	countyData, ok := ghwoData.Counties[countyFips]
	if !ok {
		// TODO
		// This is where we need to throw/log a specific error
		// For now we will panic
		panic(fmt.Sprintf("Could not find county with fips %s in the source data.", countyFips))
	}

	days, noRisks := countyData.GetRiskDays(legend)

	// Initialize the resulting output struct
	var output = Output{
		IsState:  false,
		IsCounty: true,
		Fips:     countyFips,
		Days:     days,
		NoRisks:  noRisks,
		WFO:      ghwoData.WFO,
	}

	// Adds the risks to the output
	output.AddTopLevelRisksAndLegend(
		ghwoData.WFO,
		output.Days,
		legend,
		chicklet,
	)
	output.ProcessComposite()

	return &output
}
