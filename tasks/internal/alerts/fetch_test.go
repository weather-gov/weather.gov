package alerts

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const activeAlertsFeed = `{
  "features": [
    {
      "geometry": null,
      "properties": {
        "id": "urn:oid:2.49.0.1.840.0.abc.001.1",
        "event": "Tornado Warning",
        "senderName": "NWS Peachtree City GA",
        "description": "Wind & hail are expected.",
        "sent": "2024-01-15T13:45:30-05:00",
        "effective": "2024-01-15T13:45:30-05:00",
        "expires": "2024-01-15T14:45:30-05:00"
      }
    }
  ]
}`

// createHash("sha256").update(JSON.stringify(properties)).digest("base64"), run under node
const nodeFeedHash = "uLTulpmk65vog9qryZq71UM/GNdXJZbH+Iy5g1O/rtE="

func propertiesOf(t *testing.T, feed string) json.RawMessage {
	t.Helper()
	var response SourceResponse
	if err := json.Unmarshal([]byte(feed), &response); err != nil {
		t.Fatalf("could not decode the feed: %v", err)
	}
	return response.Features[0].Properties
}

func TestHashProperties_MatchesNodeStringify(t *testing.T) {
	hash, err := hashProperties(propertiesOf(t, activeAlertsFeed))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if hash != nodeFeedHash {
		t.Errorf("expected %s, got %s", nodeFeedHash, hash)
	}
}

func TestHashProperties_IgnoresWhitespace(t *testing.T) {
	compact, err := hashProperties(json.RawMessage(`{"event":"Tornado Warning","id":"a"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	pretty, err := hashProperties(json.RawMessage("{\n  \"event\": \"Tornado Warning\",\n  \"id\": \"a\"\n}"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if compact != pretty {
		t.Errorf("expected the same hash either way, got %s and %s", compact, pretty)
	}
}

func TestHashProperties_DependsOnKeyOrder(t *testing.T) {
	first, err := hashProperties(json.RawMessage(`{"event":"Tornado Warning","id":"a"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	second, err := hashProperties(json.RawMessage(`{"id":"a","event":"Tornado Warning"}`))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if first == second {
		t.Error("expected reordered keys to hash differently")
	}
}

func TestGetBaseURL(t *testing.T) {
	t.Run("falls back to the public API", func(t *testing.T) {
		t.Setenv("API_URL", "")
		if got := GetBaseURL(); got != DefaultBaseURL {
			t.Errorf("expected %s, got %s", DefaultBaseURL, got)
		}
	})

	t.Run("uses API_URL when it is set", func(t *testing.T) {
		t.Setenv("API_URL", "http://api-proxy:8081")
		if got := GetBaseURL(); got != "http://api-proxy:8081" {
			t.Errorf("expected http://api-proxy:8081, got %s", got)
		}
	})
}

func TestFetch(t *testing.T) {
	var path, query, userAgent, accept string

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		path, query = request.URL.Path, request.URL.RawQuery
		userAgent, accept = request.Header.Get("User-Agent"), request.Header.Get("Accept")
		writer.Write([]byte(activeAlertsFeed))
	}))
	defer server.Close()
	t.Setenv("API_URL", server.URL)

	features, err := Fetch(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if path != "/alerts/active" || query != "status=actual" {
		t.Errorf("expected /alerts/active?status=actual, got %s?%s", path, query)
	}
	if userAgent != "beta.weather.gov interop" || accept != "application/json" {
		t.Errorf("expected the standard headers, got User-Agent %q and Accept %q", userAgent, accept)
	}

	if len(features) != 1 {
		t.Fatalf("expected 1 feature, got %d", len(features))
	}
	if features[0].Hash != nodeFeedHash {
		t.Errorf("expected hash %s, got %s", nodeFeedHash, features[0].Hash)
	}
	if features[0].Props.Event != "Tornado Warning" {
		t.Errorf("expected the properties to be decoded, got event %q", features[0].Props.Event)
	}
}

func TestFetch_MissingFeatures(t *testing.T) {
	for _, body := range []string{`{}`, `{"features":null}`} {
		t.Run(body, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
				writer.Write([]byte(body))
			}))
			defer server.Close()
			t.Setenv("API_URL", server.URL)

			if _, err := Fetch(context.Background()); err == nil {
				t.Error("expected an error for a response with no features array")
			}
		})
	}
}

func TestFetch_NotOK(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.WriteHeader(http.StatusBadGateway)
	}))
	defer server.Close()
	t.Setenv("API_URL", server.URL)

	_, err := Fetch(context.Background())
	if err == nil {
		t.Fatal("expected an error for a 502")
	}
	if !strings.Contains(err.Error(), "502") {
		t.Errorf("expected the status in the error, got %v", err)
	}
}
