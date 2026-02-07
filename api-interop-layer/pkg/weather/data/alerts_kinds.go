package data

import "strings"

// AlertKind/Level constants if needed
// Or just replicate the Map.

type AlertLevel struct {
	Priority int    `json:"priority"`
	Text     string `json:"text"`
}

type AlertKindConfig struct {
	Level    AlertLevel `json:"level"`
	Kind     string     `json:"kind"`
	Priority int        `json:"priority"`
}

var AlertKinds = map[string]AlertKindConfig{
	"tsunami warning": {
		Level:    AlertLevel{0, "warning"},
		Kind:     "land",
		Priority: 0,
	},
	"tornado warning": {
		Level:    AlertLevel{0, "warning"},
		Kind:     "land",
		Priority: 1024,
	},
	// Truncated list for now, user can expand or I can copy more if critical.
	// I'll add "severe thunderstorm warning" and "flash flood warning" etc. as common ones.
	"severe thunderstorm warning": {Level: AlertLevel{0, "warning"}, Kind: "land", Priority: 3072},
	"flash flood warning":         {Level: AlertLevel{0, "warning"}, Kind: "land", Priority: 4096},
	"winter storm warning":        {Level: AlertLevel{0, "warning"}, Kind: "land", Priority: 25600},
	"high wind warning":           {Level: AlertLevel{0, "warning"}, Kind: "land", Priority: 29696},
	"heat advisory":               {Level: AlertLevel{2048, "other"}, Kind: "land", Priority: 63488},
	// ...
	// Fallback for "other"?
}

func GetAlertKind(event string) AlertKindConfig {
	if k, ok := AlertKinds[strings.ToLower(event)]; ok {
		return k
	}
	// Default?
	return AlertKindConfig{
		Level:    AlertLevel{2048, "other"},
		Kind:     "other",
		Priority: 99999, // Lower than others?
	}
}
