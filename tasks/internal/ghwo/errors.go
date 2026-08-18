package ghwo

/**
* The 'kind' for a wrapped error will be one of:
*    - generic
*    - wfo
*    - county
*    - state
 */
type GHWOError struct {
	Kind     string       `json:"kind"`
	Errors   []string     `json:"errors"`
	WFO      string       `json:"wfo"`
	Locality LocalityCode `json:"localityCode"`
}

func errorsToStrings(errors []error) []string {
	result := make([]string, 0)
	for _, err := range errors {
		if err != nil {
			result = append(
				result,
				err.Error(),
			)
		}
	}
	return result
}

func NewGHWOError(kind string, errors []error, wfo string, locality LocalityCode) *GHWOError {
	return &GHWOError{
		Kind:     kind,
		WFO:      wfo,
		Locality: locality,
		Errors:   errorsToStrings(errors),
	}
}

func NewGenericGHWOError(err error) *GHWOError {
	return &GHWOError{
		Kind:   "generic",
		Errors: errorsToStrings([]error{err}),
	}
}

func NewGHWOErrorForWFO(wfo string, errors []error) *GHWOError {
	return &GHWOError{
		Kind:   "wfo",
		Errors: errorsToStrings(errors),
		WFO:    wfo,
	}
}

func NewGHWOErrorForCounty(countyFips LocalityCode, wfo string, errors []error) *GHWOError {
	return &GHWOError{
		Kind:     "county",
		Locality: countyFips,
		WFO:      wfo,
		Errors:   errorsToStrings(errors),
	}
}

func NewGHWOErrorForState(stateCode LocalityCode, wfo string, errors []error) *GHWOError {
	return &GHWOError{
		Kind:     "state",
		Locality: stateCode,
		WFO:      wfo,
		Errors:   errorsToStrings(errors),
	}
}

func GHWOErrorsFromFetchResult(fetchResult *FetchResult) []*GHWOError {
	result := make([]*GHWOError, 0)

	// If the FetchResult itself has errors, this indicates that
	// there was an error retrieving critical data at the WFO level,
	// meaning the whole WFO has errored out.
	if len(fetchResult.Errors) > 0 {
		result = append(
			result,
			NewGHWOErrorForWFO(
				fetchResult.WFO,
				fetchResult.Errors,
			),
		)
	}

	// Loop through each of the possible StateFetchResult structs.
	// If any of these has errors, it indicates that there was an
	// error fetching critical data at the State level,
	// meaning we have an error for that state overall
	for stateCode, stateFetchResult := range fetchResult.States {
		if len(stateFetchResult.Errors) > 0 {
			result = append(
				result,
				NewGHWOErrorForState(
					stateCode,
					fetchResult.WFO,
					stateFetchResult.Errors,
				),
			)
		}
	}

	return result
}
