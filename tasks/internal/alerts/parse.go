package alerts

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

var (
	paragraphSquashRe = regexp.MustCompile(`([^\n])\n([^\n])`)
	titleCaseRe       = regexp.MustCompile(`\w\S*`)

	startTokenRe = regexp.MustCompile(`(?ims)IN \S+ (THIS|THE NEW) \S+ INCLUDES \d+ COUNTIES\n$`)

	// Anchored so a county name ending in IN, like FANNIN, doesn't open a region
	regionTokenRe = regexp.MustCompile(`(?m)^IN (.+)\n`)

	regionInnerRe   = regexp.MustCompile(`IN (.+)`)
	countyHeadingRe = regexp.MustCompile(`THIS \S+ INCLUDES \d+ COUNTIES$`)
	innerPlacesRe   = regexp.MustCompile(`(?s)(.+?)(\n\n|$)`)
	citiesRe        = regexp.MustCompile(`(?is)THIS INCLUDES THE CITIES OF(.+?)(\n\n|$)`)
	andRe           = regexp.MustCompile(`(?i)\sand\s`)
	runsOfSpaceRe   = regexp.MustCompile(`\s{2,}`)

	paragraphSplitRe = regexp.MustCompile(`\r\n|\r|\n`)
	overviewRe       = regexp.MustCompile(`^\.\.\.([^.]+)\.\.\.$`)
	headingRe        = regexp.MustCompile(`^\*\s+([A-Z\s]+)\.\.\.(.*)$`)
	urlRe            = regexp.MustCompile(`(?i)https://[A-Za-z0-9\-._~:?#\[\]@!$]+(/\S+|$)\b`)
)

// Join single newlines into spaces, leaving blank-line breaks alone
func paragraphSquash(str string) string {
	return paragraphSquashRe.ReplaceAllString(str, "${1} ${2}")
}

func titleCase(str string) string {
	return titleCaseRe.ReplaceAllStringFunc(str, func(word string) string {
		// The match always starts with \w, so the first byte is ASCII and safe to split on
		return strings.ToUpper(word[:1]) + strings.ToLower(word[1:])
	})
}

// Clamped, because the offsets walking a description can run past its end
func substrFrom(s string, start int) string {
	return s[min(max(start, 0), len(s)):]
}

func substrTo(s string, end int) string {
	return s[:min(max(end, 0), len(s))]
}

func replaceFirst(re *regexp.Regexp, s, repl string) string {
	loc := re.FindStringIndex(s)
	if loc == nil {
		return s
	}
	return s[:loc[0]] + repl + s[loc[1]:]
}

// Strip the structured county and city block out of a description and return it
func ParseLocations(description string) (*Locations, string, error) {
	if description == "" {
		return nil, description, nil
	}

	updatedDescription := description
	locations := &Locations{Regions: []Region{}, Cities: []string{}}

	startToken := startTokenRe.FindString(description)
	if startToken != "" {
		startIndex := strings.Index(updatedDescription, startToken)
		endIndex := startIndex + len(startToken)

		for _, regionToken := range regionTokenRe.FindAllString(substrFrom(updatedDescription, endIndex), -1) {
			regionToken = strings.TrimSpace(regionToken)

			inner := regionInnerRe.FindStringSubmatch(regionToken)
			if inner == nil {
				return nil, description, fmt.Errorf("region token %q has no name", regionToken)
			}
			region := inner[1]

			// Two more for the blank line after the heading
			endIndex += len(regionToken) + 2

			// A multi-state alert repeats the county heading, which is not a region
			if countyHeadingRe.MatchString(regionToken) {
				continue
			}

			area := titleCase(strings.TrimPrefix(region, "IN "))

			places := innerPlacesRe.FindStringSubmatch(substrFrom(description, endIndex))
			if places == nil {
				return nil, description, fmt.Errorf("no county block under region %q", area)
			}
			innerPlaces := places[1]

			// Counties are laid out in fixed-width columns, so whitespace runs are the delimiter
			counties := strings.Split(
				runsOfSpaceRe.ReplaceAllString(
					strings.ReplaceAll(strings.TrimSpace(innerPlaces), "\n", "  "),
					",",
				),
				",",
			)
			for i, county := range counties {
				counties[i] = titleCase(county)
			}
			locations.Regions = append(locations.Regions, Region{Area: area, Counties: counties})

			endIndex += len(innerPlaces)
		}

		if match := citiesRe.FindStringSubmatch(updatedDescription); match != nil {
			citiesToken, cities := match[0], match[1]

			// The list may end with a grammatical "and" before the last item
			cities = replaceFirst(andRe, cities, "")
			cities = strings.ReplaceAll(cities, "\n", " ")

			locations.Cities = strings.Split(cities, ",")
			for i, city := range locations.Cities {
				locations.Cities[i] = titleCase(strings.TrimSuffix(strings.TrimSpace(city), "."))
			}

			endIndex += len(citiesToken) + 2
		}

		updatedDescription = substrTo(updatedDescription, startIndex) + substrFrom(updatedDescription, endIndex)
	}

	if len(locations.Regions) > 0 || len(locations.Cities) > 0 {
		return locations, strings.TrimSpace(updatedDescription), nil
	}

	// Most alerts take this path, which is why alertjson usually has no locations key
	return nil, description, nil
}

// Find the .gov links in a string, each paired with the text it was matched from
func extractURLs(str string) ([]urlMatch, error) {
	var links []urlMatch
	for _, match := range urlRe.FindAllString(str, -1) {
		parsed, err := url.Parse(match)
		if err != nil {
			return nil, fmt.Errorf("parsing url %q: %w", match, err)
		}

		hostname := strings.ToLower(parsed.Hostname())
		if parsed.User != nil || !strings.HasSuffix(hostname, ".gov") {
			continue
		}

		internal := hostname == "weather.gov" || strings.HasSuffix(hostname, ".weather.gov")
		links = append(links, urlMatch{
			Text: match,
			Node: linkNode{Type: "link", URL: href(parsed), External: !internal},
		})
	}
	return links, nil
}

// Lower-case the host and give an empty path a slash, the way a browser would
func href(u *url.URL) string {
	normalized := *u
	normalized.Host = strings.ToLower(normalized.Host)
	if normalized.Path == "" {
		normalized.Path = "/"
	}
	return normalized.String()
}

// Split a string into alternating text and link nodes
func paragraphNodesFor(str string) ([]any, error) {
	links, err := extractURLs(str)
	if err != nil {
		return nil, err
	}
	if len(links) == 0 {
		return []any{textNode{Type: "text", Content: str}}, nil
	}

	nodes := []any{}
	current := str
	for _, link := range links {
		// Cut on the matched text, not the normalized URL, which may no longer be in the string
		before, after, found := strings.Cut(current, link.Text)
		if !found {
			continue
		}
		nodes = append(nodes, textNode{Type: "text", Content: before}, link.Node)
		current = after
	}

	if len(current) > 0 {
		nodes = append(nodes, textNode{Type: "text", Content: current})
	}

	return nodes, nil
}

// Turn a description into the nodes the front end renders
func ParseDescription(description string) ([]any, error) {
	if description == "" {
		return []any{paragraphNode{Type: "paragraph", Nodes: []any{}}}, nil
	}

	nodes := []any{}
	for _, paragraph := range paragraphSplitRe.Split(paragraphSquash(description), -1) {
		if len(paragraph) == 0 {
			continue
		}

		// A paragraph can't open with both ... and *, so at most one of these matches
		overview := overviewRe.FindStringSubmatch(paragraph)
		heading := headingRe.FindStringSubmatch(paragraph)

		switch {
		case overview != nil:
			inner, err := paragraphNodesFor(overview[1])
			if err != nil {
				return nil, err
			}
			nodes = append(nodes, paragraphNode{Type: "paragraph", Nodes: inner})

		case heading != nil:
			inner, err := paragraphNodesFor(heading[2])
			if err != nil {
				return nil, err
			}
			nodes = append(nodes,
				headingNode{Type: "heading", Text: strings.ToLower(heading[1])},
				paragraphNode{Type: "paragraph", Nodes: inner},
			)

		default:
			inner, err := paragraphNodesFor(paragraph)
			if err != nil {
				return nil, err
			}
			nodes = append(nodes, paragraphNode{Type: "paragraph", Nodes: inner})
		}
	}

	return nodes, nil
}
