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
