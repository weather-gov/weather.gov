package data

import (
	"sort"
)

type RestAlertMeta struct {
	Name string    `json:"name"`
	Kind AlertKind `json:"kind"`
}

func GetMetaAlerts() []RestAlertMeta {
	type alertEntry struct {
		Name     string
		Priority int
		Kind     AlertKind
	}

	entries := make([]alertEntry, 0, len(AlertTypes))
	for name, alertType := range AlertTypes {
		entries = append(entries, alertEntry{
			Name:     name,
			Priority: alertType.Priority,
			Kind:     alertType.Kind,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Priority < entries[j].Priority
	})

	output := make([]RestAlertMeta, len(entries))
	for i, entry := range entries {
		output[i] = RestAlertMeta{
			Name: entry.Name,
			Kind: entry.Kind,
		}
	}

	return output
}
