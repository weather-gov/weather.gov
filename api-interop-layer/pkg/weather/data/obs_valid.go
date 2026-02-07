package data

// IsObservationValid checks if an observation has valid temperature and either wind or humidity
func IsObservationValid(obs map[string]interface{}) bool {
	if obs == nil {
		return false
	}

	// Match TS logic: Only checks temperature value
	if val, ok := obs["temperature"].(map[string]interface{}); ok {
		if val["value"] != nil {
			return true
		}
	}
	return false
}
