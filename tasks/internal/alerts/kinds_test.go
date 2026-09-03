package alerts

import (
	"strings"
	"testing"
)

func TestEventToMetadata_Wellformed(t *testing.T) {
	kinds := map[string]bool{KindLand: true, KindMarine: true, KindOther: true}
	levels := map[Level]bool{LevelWarning: true, LevelWatch: true, LevelOther: true}

	priorities := map[int]string{}
	for event, metadata := range EventToMetadata {
		if event != strings.ToLower(event) || event != strings.TrimSpace(event) {
			t.Errorf("%q is not a lowercased, trimmed event name, so metadataFor can never find it", event)
		}
		if !kinds[metadata.Kind] {
			t.Errorf("%q has kind %q, which is not a kind we store", event, metadata.Kind)
		}
		if !levels[metadata.Level] {
			t.Errorf("%q has level %v, which is not one of the three levels", event, metadata.Level)
		}
		if other, taken := priorities[metadata.Priority]; taken {
			t.Errorf("%q and %q share priority %d, so their sort order is arbitrary", event, other, metadata.Priority)
		}
		priorities[metadata.Priority] = event
	}
}

func TestEventToMetadata_HasTheHighestSeverityEvents(t *testing.T) {
	// A missing entry here means an unmapped event falls back to the lowest priority
	for _, event := range []string{
		"tornado warning",
		"tsunami warning",
		"flash flood warning",
		"severe thunderstorm warning",
		"hurricane warning",
		"extreme wind warning",
		"evacuation immediate",
	} {
		metadata, ok := EventToMetadata[event]
		if !ok {
			t.Errorf("%q has no mapping", event)
			continue
		}
		if metadata.Priority >= EventToMetadata["special weather statement"].Priority {
			t.Errorf("%q sorts below a special weather statement at priority %d", event, metadata.Priority)
		}
	}
}

func TestStoredKinds(t *testing.T) {
	if !storedKinds[KindLand] {
		t.Errorf("expected land alerts to be stored, got %v", storedKinds)
	}
	if storedKinds[KindMarine] || storedKinds[KindOther] {
		t.Errorf("expected marine and other-kind alerts to stay tombstoned, got %v", storedKinds)
	}
}

func TestUnknownMetadata(t *testing.T) {
	if UnknownMetadata.Kind != KindLand {
		t.Errorf("expected an unmapped event to stay on land, got %q", UnknownMetadata.Kind)
	}
	if UnknownMetadata.Priority != unmappedPriority || UnknownMetadata.Level.Priority != unmappedPriority {
		t.Errorf("expected an unmapped event to sort last, got %v", UnknownMetadata)
	}
}
