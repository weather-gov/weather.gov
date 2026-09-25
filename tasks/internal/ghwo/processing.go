package ghwo

import "fmt"

func ProcessCounty(wfoCode string, fipsCode LocalityCode, county *SourceGHWOLocality, legend OutputSummaryLegend, chicklet ChickletLookup) (*Output, error) {
	days, noRisks := county.GetRiskDays(legend)

	// If the days array is empty, we don't have any risk
	// data available for the county. We handle this case as an error.
	if len(days) == 0 {
		return nil, fmt.Errorf("No risk day data found for county %s", fipsCode)
	}

	// Initialize the resullting struct
	var output = &Output{
		IsState:  false,
		IsCounty: true,
		Fips:     fipsCode,
		Days:     days,
		NoRisks:  noRisks,
		WFO:      wfoCode,
	}

	// Add the risks to the output
	output.AddTopLevelRisksAndLegend(
		wfoCode,
		output.Days,
		legend,
		chicklet,
	)
	output.ProcessComposite()
	return output, nil
}

func ProcessStateWithDetails(wfoCode string, stateCode LocalityCode, state *SourceGHWOLocality, legend OutputSummaryLegend, chicklet ChickletLookup) (*Output, error) {
	// Note: we assume the state specific legend
	// and chicklet are already processed and handed off to this function

	days, noRisks := state.GetRiskDays(legend)

	// If the days array is empty, we don't have any risk
	// data for the state. We handle this case as an error.
	if len(days) == 0 {
		return nil, fmt.Errorf("No risks day data found for state %s", stateCode)
	}

	result := &Output{
		WFO:             wfoCode,
		IsState:         true,
		IsCounty:        false,
		State:           stateCode,
		Days:            days,
		NoRisks:         noRisks,
		HasDetailedGHWO: true,
	}

	result.AddTopLevelRisksAndLegend(
		wfoCode,
		result.Days,
		legend,
		chicklet,
	)

	result.ProcessComposite()

	return result, nil
}

func ProcessStateWithoutDetails(wfoCode string, stateCode LocalityCode, state *SourceGHWOLocality) (*Output, error) {
	// If we call this function, i tmeans that there was no state-specific
	// chicklet or legend data available, and therefore we cannot
	// process detailed GHWO data for the state.
	// However, we can still create the daily composite data.
	emptyLegend := OutputSummaryLegend{}
	days, noRisks := state.GetRiskDays(emptyLegend)

	// If the days array is empty, we don't have any risk
	// data for the state. We handle this case as an error.
	if len(days) == 0 {
		return nil, fmt.Errorf("No risks day data found for state %s", stateCode)
	}

	result := &Output{
		WFO:             wfoCode,
		IsState:         true,
		IsCounty:        false,
		State:           stateCode,
		Days:            days,
		NoRisks:         noRisks,
		HasDetailedGHWO: false,
	}

	result.ProcessComposite()

	return result, nil
}
