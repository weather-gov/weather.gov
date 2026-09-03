package alerts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	evacuationRe = regexp.MustCompile(`(?i)\bevacuation\b`)

	// Some of these fields hold prose, and a loose parse would pull a date out of it
	isoDateRe = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}`)
)

const (
	// Interop parses the milliseconds back out, and RFC3339 drops them
	timestampLayout = "2006-01-02T15:04:05.000Z"

	oidPrefix = "urn:oid:2.49.0.1.840"
)

// A feed timestamp, which is usually a date but is sometimes prose
type timestamp struct {
	text  string
	at    time.Time
	dated bool
}

// Reformats an ISO date to UTC milliseconds, and leaves anything that isn't a date alone
func parseTimestamp(value string) timestamp {
	if !isoDateRe.MatchString(value) {
		return timestamp{text: value}
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return timestamp{text: value}
	}
	return timestamp{text: parsed.UTC().Format(timestampLayout), at: parsed, dated: true}
}

// The stored text goes straight to the front end, so <, > and & stay unescaped
func marshalWithoutHTMLEscaping(value any) ([]byte, error) {
	var buffer bytes.Buffer
	encoder := json.NewEncoder(&buffer)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return nil, err
	}
	return bytes.TrimRight(buffer.Bytes(), "\n"), nil
}

// A county SAME code is a FIPS state+county code with a leading zero
func fipsFromSAME(same string) string {
	return substrFrom(same, 1)
}

func lastThree(id string) string {
	parts := strings.Split(id, ".")
	if len(parts) > 3 {
		parts = parts[len(parts)-3:]
	}
	return strings.Join(parts, "_")
}

// Fall back to a lowest-priority land alert so unmapped events still reach users
func metadataFor(event string) Metadata {
	if metadata, ok := EventToMetadata[strings.ToLower(event)]; ok {
		return metadata
	}

	logger.Warn("unknown alert type", "alert", event)

	// Anything mentioning evacuation uses the NWS evacuation alert instead
	if evacuationRe.MatchString(event) {
		return EventToMetadata["evacuation immediate"]
	}
	return UnknownMetadata
}

// Turn one feature into the row to write, or report that it should be skipped
func processAlert(feature *SourceFeature, now time.Time, knownZones map[string]bool) (Row, bool, error) {
	properties := feature.Props
	metadata := metadataFor(properties.Event)

	// Stored with no geometry, so it never comes back from a lookup
	if !storedKinds[metadata.Kind] {
		logger.Debug("ignoring alert kind", "alert", properties.Event, "kind", metadata.Kind)

		alertJSON, err := marshalWithoutHTMLEscaping(Tombstone{Metadata: metadata})
		if err != nil {
			return Row{}, false, err
		}
		return Row{
			Hash:      feature.Hash,
			AlertJSON: alertJSON,
			Counties:  []byte("[]"),
			States:    []byte("[]"),
			AlertKind: metadata.Kind,
		}, true, nil
	}

	alert := Alert{
		Hash:     feature.Hash,
		ID:       feature.Hash,
		Event:    properties.Event,
		Metadata: metadata,
	}
	if strings.HasPrefix(properties.ID, oidPrefix) {
		alert.ID = lastThree(properties.ID)
	}

	// A parse failure skips the assignments below it rather than dropping the alert
	locations, description, err := ParseLocations(properties.Description)
	if err != nil {
		logger.Error("could not parse locations", "err", err, "alertId", properties.ID)
	} else {
		alert.Sender = properties.SenderName
		alert.Locations = locations

		parsed, err := ParseDescription(description)
		if err != nil {
			logger.Error("could not parse description", "err", err, "alertId", properties.ID)
		} else {
			alert.Description = parsed
			if properties.Instruction != nil {
				instruction := paragraphSquash(*properties.Instruction)
				alert.Instruction = &instruction
			}
		}
	}

	if properties.AreaDesc != nil {
		areas := strings.Split(paragraphSquash(*properties.AreaDesc), ";")
		for i, area := range areas {
			areas[i] = strings.TrimSpace(area)
		}
		alert.Area = areas
	}

	alert.Sent = parseTimestamp(properties.Sent).text
	alert.Effective = parseTimestamp(properties.Effective).text

	// Onset is sometimes missing, in which case the alert starts when it becomes effective
	alert.Onset = alert.Effective
	if properties.Onset != nil {
		alert.Onset = parseTimestamp(*properties.Onset).text
	}

	expires := parseTimestamp(properties.Expires)
	alert.Expires = expires.text

	var ends timestamp
	if properties.Ends != nil {
		ends = parseTimestamp(*properties.Ends)
		alert.Ends = &ends.text
	}

	// Use the end time if there is one, otherwise the expiry, otherwise the alert has no end
	var finish timestamp
	switch {
	case alert.Ends != nil && *alert.Ends != "":
		finish, alert.Finish = ends, alert.Ends
	case alert.Expires != "":
		finish, alert.Finish = expires, &alert.Expires
	}

	if finish.dated && finish.at.Before(now) {
		return Row{}, false, nil
	}

	counties := make([]string, 0, len(properties.Geocode.SAME))
	for _, same := range properties.Geocode.SAME {
		counties = append(counties, fipsFromSAME(same))
	}

	// Not deduplicated, so two counties in the same state add that state twice
	states := make([]string, 0, len(counties))
	for _, county := range counties {
		states = append(states, substrTo(county, 2))
	}

	geometry, err := resolveGeometry(feature, knownZones)
	if err != nil {
		return Row{}, false, err
	}
	if geometry == nil {
		logger.Error("could not determine geometry", "alertId", properties.ID)
		return Row{}, false, nil
	}

	alertJSON, err := marshalWithoutHTMLEscaping(alert)
	if err != nil {
		return Row{}, false, err
	}
	countiesJSON, err := json.Marshal(counties)
	if err != nil {
		return Row{}, false, err
	}
	statesJSON, err := json.Marshal(states)
	if err != nil {
		return Row{}, false, err
	}

	return Row{
		Hash:      feature.Hash,
		AlertJSON: alertJSON,
		Counties:  countiesJSON,
		States:    statesJSON,
		AlertKind: metadata.Kind,
		Geometry:  geometry,
	}, true, nil
}

// One query for the whole run rather than one per alert
func zoneIDsFor(features []SourceFeature) []string {
	seen := map[string]bool{}
	ids := []string{}
	for _, feature := range features {
		for _, zone := range feature.Props.AffectedZones {
			if strings.Contains(zone, countyZonePath) || seen[zone] {
				continue
			}
			seen[zone] = true
			ids = append(ids, zone)
		}
	}
	return ids
}

// processAlert is pure aside from logging, so the features fan out across cores
func transform(features []SourceFeature, now time.Time, knownZones map[string]bool) []Row {
	processed := make([]Row, len(features))
	keep := make([]bool, len(features))

	indexes := make(chan int, len(features))
	for i := range features {
		indexes <- i
	}
	close(indexes)

	var wg sync.WaitGroup
	for range min(runtime.NumCPU(), len(features)) {
		wg.Go(func() {
			for i := range indexes {
				row, ok, err := processAlert(&features[i], now, knownZones)
				if err != nil {
					// One malformed alert costs that alert, not the run
					logger.Error("could not process alert", "err", err, "alertId", features[i].Props.ID)
					continue
				}
				processed[i], keep[i] = row, ok
			}
		})
	}
	wg.Wait()

	// Collected in feed order so two runs of the same feed load identically
	rows := make([]Row, 0, len(features))
	for i, ok := range keep {
		if ok {
			rows = append(rows, processed[i])
		}
	}
	return rows
}

// Rebuild the whole cache from the feed and swap it in for the live table
func Update(ctx context.Context, pool *pgxpool.Pool) error {
	now := time.Now()

	features, err := Fetch(ctx)
	if err != nil {
		return err
	}
	logger.Debug("alerts", "length", len(features))

	// An empty feed reads as every alert clearing at once, which is a bad response far more often
	if len(features) == 0 {
		logger.Warn("feed returned no alerts, leaving the cache alone")
		return nil
	}

	knownZones, err := KnownZones(ctx, pool, zoneIDsFor(features))
	if err != nil {
		return fmt.Errorf("reading known zones: %w", err)
	}

	rows := transform(features, now, knownZones)
	if len(rows) == 0 {
		logger.Warn("no alerts survived processing, leaving the cache alone")
		return nil
	}

	store := NewStore()
	if err := store.Create(ctx, pool); err != nil {
		return err
	}

	stored, err := store.Load(ctx, pool, rows)
	if err != nil {
		return err
	}
	if stored == 0 {
		return fmt.Errorf("every alert write failed (%d rows)", len(rows))
	}

	if err := store.Swap(ctx, pool); err != nil {
		return err
	}

	logger.Info("alerts updated", "stored", stored, "failed", len(rows)-stored)
	return nil
}
