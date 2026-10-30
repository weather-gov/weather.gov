package alerts

import (
	"slices"
	"strings"
	"time"
)

const airQualityAlert = "air quality alert"

// Air Quality Alerts a newer one replaces in every zone, plus zones lost by ones still newest elsewhere
func supersededAirQuality(features []SourceFeature) (map[int][]string, map[int][]string) {
	type newest struct {
		sent  time.Time
		index int
	}

	byZone := map[string]newest{}
	candidates := []int{}
	for i := range features {
		props := &features[i].Props
		sent := parseTimestamp(props.Sent)
		// No zones or no usable sent means nothing to compare, so it always stays
		if strings.ToLower(props.Event) != airQualityAlert || len(props.Geocode.UGC) == 0 || !sent.dated {
			continue
		}
		candidates = append(candidates, i)
		for _, zone := range props.Geocode.UGC {
			// Strictly newer, so a tie goes to the first in the feed
			if current, ok := byZone[zone]; !ok || sent.at.After(current.sent) {
				byZone[zone] = newest{sent: sent.at, index: i}
			}
		}
	}

	winners := map[int]bool{}
	for _, entry := range byZone {
		winners[entry.index] = true
	}

	superseded := map[int][]string{}
	outdated := map[int][]string{}
	for _, i := range candidates {
		if winners[i] {
			for _, zone := range features[i].Props.Geocode.UGC {
				if byZone[zone].index != i {
					outdated[i] = append(outdated[i], zone)
				}
			}
			continue
		}
		by := []string{}
		for _, zone := range features[i].Props.Geocode.UGC {
			id := features[byZone[zone].index].Props.ID
			if !slices.Contains(by, id) {
				by = append(by, id)
			}
		}
		superseded[i] = by
	}
	return superseded, outdated
}

// Drops outdated zones so the stored shape stops overlapping the newer alert
func trimAffectedZones(feature *SourceFeature, outdated []string) {
	kept := []string{}
	for _, zone := range feature.Props.AffectedZones {
		if !slices.Contains(outdated, zone[strings.LastIndex(zone, "/")+1:]) {
			kept = append(kept, zone)
		}
	}
	feature.Props.AffectedZones = kept
}
