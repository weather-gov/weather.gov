package alerts

import "encoding/json"

type SourceResponse struct {
	Features []SourceFeature `json:"features"`
}

type SourceFeature struct {
	Geometry json.RawMessage `json:"geometry"`

	// Raw because the hash covers these exact bytes
	Properties json.RawMessage `json:"properties"`

	Hash  string           `json:"-"`
	Props SourceProperties `json:"-"`
}

type SourceProperties struct {
	ID         string `json:"id"`
	Event      string `json:"event"`
	SenderName string `json:"senderName"`

	// Pointers so a missing value drops the alertjson key, but an empty string keeps it
	AreaDesc      *string  `json:"areaDesc"`
	Description   string   `json:"description"`
	Instruction   *string  `json:"instruction"`
	Sent          string   `json:"sent"`
	Effective     string   `json:"effective"`
	Onset         *string  `json:"onset"`
	Expires       string   `json:"expires"`
	Ends          *string  `json:"ends"`
	AffectedZones []string `json:"affectedZones"`
	Geocode       struct {
		SAME []string `json:"SAME"`
	} `json:"geocode"`
}

type Level struct {
	Priority int    `json:"priority"`
	Text     string `json:"text"`
}

type Metadata struct {
	Level    Level  `json:"level"`
	Kind     string `json:"kind"`
	Priority int    `json:"priority"`
}

// The alertjson payload for a land alert
type Alert struct {
	Hash        string     `json:"hash"`
	ID          string     `json:"id"`
	Event       string     `json:"event"`
	Metadata    Metadata   `json:"metadata"`
	Sender      string     `json:"sender,omitempty"`
	Locations   *Locations `json:"locations,omitempty"`
	Description []any      `json:"description,omitempty"`
	Instruction *string    `json:"instruction,omitempty"`
	Area        []string   `json:"area,omitempty"`
	Sent        string     `json:"sent"`
	Effective   string     `json:"effective"`
	Onset       string     `json:"onset"`
	Expires     string     `json:"expires"`

	// Stored as a literal null, so no omitempty
	Ends   *string `json:"ends"`
	Finish *string `json:"finish"`
}

// The alertjson payload for a non-land alert
type Tombstone struct {
	Metadata Metadata `json:"metadata"`
}

type Locations struct {
	Regions []Region `json:"regions"`
	Cities  []string `json:"cities"`
}

type Region struct {
	Area     string   `json:"area"`
	Counties []string `json:"counties"`
}

// Separate types because one struct with omitempty drops keys the front end reads
type (
	paragraphNode struct {
		Type  string `json:"type"`
		Nodes []any  `json:"nodes"`
	}

	headingNode struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}

	textNode struct {
		Type    string `json:"type"`
		Content string `json:"content"`
	}

	linkNode struct {
		Type     string `json:"type"`
		URL      string `json:"url"`
		External bool   `json:"external"`
	}
)

// A link node plus the text it came from, which normalizing the URL may have changed
type urlMatch struct {
	Text string
	Node linkNode
}

// Where an alert's shape comes from
type GeometrySource int

const (
	GeometryInline GeometrySource = iota
	GeometryZones
	GeometryCounties
)

// Inline GeoJSON in Shape, or the ids to union zone or county shapes from
type Geometry struct {
	Shape  json.RawMessage
	Source GeometrySource
	IDs    []string
}

// One alert ready to write
type Row struct {
	Hash      string
	AlertJSON []byte
	Counties  []byte
	States    []byte
	AlertKind string
	Geometry  *Geometry
}
