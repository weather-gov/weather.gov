package data

import (
	"time"
)

type Alert struct {
	ID         string                 `json:"id"`
	Event      string                 `json:"event"`
	Properties map[string]interface{} `json:"properties,omitempty"`
	Geometry   interface{}            `json:"geometry,omitempty"`

	// Processed fields
	Metadata AlertMetadata `json:"metadata"`
	Duration string        `json:"duration"`
	Timing   AlertTiming   `json:"timing"`

	// Onset/Finish as generic time
	Onset  time.Time `json:"__onset"`
	Finish time.Time `json:"__finish"`
	// In Go we usually use struct fields for time.
	// The map[string]interface properties might contain them as strings.
	// We'll extract them.
}

type AlertMetadata struct {
	Level    string `json:"level"`
	Kind     string `json:"kind"`
	Priority int    `json:"priority"`
}

type AlertTiming struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type AlertsResponse struct {
	Items        []Alert                `json:"items"`
	HighestLevel string                 `json:"highestLevel"`
	Metadata     map[string]interface{} `json:"metadata"`
}
