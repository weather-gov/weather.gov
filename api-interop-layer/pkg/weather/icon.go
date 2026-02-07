package weather

import (
	_ "embed"
	"encoding/json"
	"net/url"
	"regexp"
	"strings"
)

//go:embed icon.legacyMapping.json
var iconLegacyMappingData []byte

type IconResult struct {
	Icon *string `json:"icon"`
	Base *string `json:"base"`
}

type LegacyIconEntry struct {
	Icon string `json:"icon"`
}

var legacyMapping map[string]LegacyIconEntry

func init() {
	json.Unmarshal(iconLegacyMappingData, &legacyMapping)
}

func ParseAPIIcon(apiIcon string) IconResult {
	res := IconResult{}

	// Validate URL
	u, err := url.Parse(apiIcon)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return res // returns with nulls (nil pointers)
	}

	pathParts := strings.Split(u.Path, "/")
	// JS: .splice(3). Discards elements 0, 1, 2.
	// pathParts["", "icons", "land", "day", "few"] -> 0="", 1="icons", 2="land"
	// So we want from index 3 onwards.
	if len(pathParts) > 3 {
		pathParts = pathParts[3:]
	} else {
		pathParts = []string{}
	}

	// Remove comma suffix: replace(/,.*$/, "")
	// Also JS does map logic
	regexComma := regexp.MustCompile(`,.*$`)
	for i, v := range pathParts {
		pathParts[i] = regexComma.ReplaceAllString(v, "")
	}

	// Logic: if iconPath.length === 3, splice(2, 1) (remove index 2)
	// Meaning: [a, b, c] -> [a, b]
	if len(pathParts) == 3 {
		// New slice with 0, 1
		pathParts = pathParts[:2]
	}

	iconKey := strings.Join(pathParts, "/")

	if val, ok := legacyMapping[iconKey]; ok {
		iconStr := val.Icon
		res.Icon = &iconStr

		// base = icon.slice(0, -4)
		if len(iconStr) >= 4 {
			baseStr := iconStr[:len(iconStr)-4]
			res.Base = &baseStr
		}
	} else {
		// Logger warn? We don't have logger here yet.
	}

	return res
}
