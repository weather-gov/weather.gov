package data

import (
	"regexp"
	"strings"
)

// AFDNode represents a parsed node in the AFD structure
type AFDNode struct {
	Type    string        `json:"type"`
	Content string        `json:"content,omitempty"`
	Rows    []AFDTempsRow `json:"rows,omitempty"`
}

type AFDTempsRow struct {
	Type    string   `json:"type"`
	Numbers []string `json:"numbers"`
	Name    string   `json:"name,omitempty"`
}

type AFDStructure struct {
	Preamble struct {
		Code []AFDNode `json:"code"`
		Text []AFDNode `json:"text"`
	} `json:"preamble"`
	Body     []AFDNode `json:"body"`
	Epilogue []AFDNode `json:"epilogue"`
}

var (
	// Regexes
	// TS: ^\.(?<header>[A-Z]{3}\sWATCHES\/WARNINGS\/ADVISORIES)[.]{3}
	// Go: (?P<header>...)
	reWWA = regexp.MustCompile(`^\.(?P<header>[A-Z]{3}\sWATCHES/WARNINGS/ADVISORIES)[.]{3}`)

	// TS: ^\.(?<header>.*TEMPS\/POPS)[.]{3}
	reTempsTable = regexp.MustCompile(`^\.(?P<header>.*TEMPS/POPS)[.]{3}`)

	// TS: ^\.(?<header>.+)[.]{3}
	reGenericHeader = regexp.MustCompile(`^\.(?P<header>.+)[.]{3}`)

	// TS: ^\s*\.{3}(?<subheader>[^.]+)\.{3}
	reSubheader = regexp.MustCompile(`^\s*\.{3}(?P<subheader>[^.]+)\.{3}`)

	// TS: ^\.[A-Za-z]
	rePreambleEnd = regexp.MustCompile(`^\.[A-Za-z]`)
)

type AFDParser struct {
	Source             string
	ParsedNodes        []AFDNode
	CurrentContentType string
}

func NewAFDParser(source string) *AFDParser {
	return &AFDParser{
		Source:             source,
		ParsedNodes:        []AFDNode{},
		CurrentContentType: "generic",
	}
}

func (p *AFDParser) Parse() {
	p.ParsedNodes = []AFDNode{}

	body := p.parseDocumentPreamble()

	// Split epilogue
	// TS: body.split(/\$\$/)
	parts := regexp.MustCompile(`\$\$`).Split(body, 2)
	bodyText := parts[0]
	var epilogueText string
	if len(parts) > 1 {
		epilogueText = parts[1]
	}

	// Sections
	// TS: splitIntoTopicSections -> split("&&\n")
	sections := p.splitIntoTopicSections(bodyText)
	for _, s := range sections {
		p.parseSection(s)
	}

	// Epilogue
	p.parseEpilogueContent(epilogueText)
}

func (p *AFDParser) GetStructureForTwig() AFDStructure {
	s := AFDStructure{
		Body:     []AFDNode{},
		Epilogue: []AFDNode{},
	}
	s.Preamble.Code = []AFDNode{}
	s.Preamble.Text = []AFDNode{}

	for _, node := range p.ParsedNodes {
		switch {
		case node.Type == "preambleCode":
			s.Preamble.Code = append(s.Preamble.Code, node)
		case node.Type == "preambleText":
			s.Preamble.Text = append(s.Preamble.Text, node)
		case strings.HasPrefix(node.Type, "epilogue"):
			s.Epilogue = append(s.Epilogue, node)
		default:
			s.Body = append(s.Body, node)
		}
	}
	return s
}

func (p *AFDParser) parseDocumentPreamble() string {
	lines := strings.Split(p.Source, "\n")
	preambleLines := []string{}
	currentLine := 0

	for currentLine < len(lines) {
		if rePreambleEnd.MatchString(lines[currentLine]) {
			break
		}
		preambleLines = append(preambleLines, lines[currentLine])
		currentLine++
	}

	remaining := ""
	if currentLine < len(lines) {
		remaining = strings.Join(lines[currentLine:], "\n")
	}

	preambleText := strings.Join(preambleLines, "\n")
	paragraphs := strings.Split(preambleText, "\n\n") // JS splits strictly? Go Split sep literal.

	for i, paragraph := range paragraphs {
		nodeType := "preambleText"
		if i == 0 {
			nodeType = "preambleCode"
		}
		text := normalizeSpaces(paragraph)
		text = strings.TrimSpace(text)

		if text != "" {
			p.ParsedNodes = append(p.ParsedNodes, AFDNode{
				Type:    nodeType,
				Content: text,
			})
		}
	}

	return remaining
}

func (p *AFDParser) parseSection(str string) {
	p.CurrentContentType = "generic"
	paragraphs := strings.Split(strings.TrimSpace(str), "\n\n")

	for _, paragraph := range paragraphs {
		rest := p.parseHeader(paragraph)
		rest = p.parseSubheader(rest)
		p.parseTextContent(rest)
	}
}

func (p *AFDParser) parseHeader(str string) string {
	// Special Headers
	// WWA
	if loc := reWWA.FindStringIndex(str); loc != nil {
		match := reWWA.FindStringSubmatch(str)
		// Header group is index 1
		header := match[1]
		header = strings.ReplaceAll(header, "/", "&hairsp;/&hairsp;") // WWA logic

		p.CurrentContentType = "wwa"
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type:    "header",
			Content: header,
		})
		return str[loc[1]:] // Slice after match
	}

	// Temps Table
	if loc := reTempsTable.FindStringIndex(str); loc != nil {
		match := reTempsTable.FindStringSubmatch(str)
		header := match[1]
		p.CurrentContentType = "tempsTable"
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type:    "header",
			Content: header,
		})
		return str[loc[1]:]
	}

	// Generic
	if loc := reGenericHeader.FindStringIndex(str); loc != nil {
		match := reGenericHeader.FindStringSubmatch(str)
		header := match[1]
		p.CurrentContentType = "generic"
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type:    "header",
			Content: header,
		})
		return str[loc[1]:]
	}

	return str
}

func (p *AFDParser) parseSubheader(str string) string {
	strTrim := strings.TrimSpace(str)
	if loc := reSubheader.FindStringIndex(strTrim); loc != nil {
		match := reSubheader.FindStringSubmatch(strTrim)
		sub := match[1]
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type:    "subheader",
			Content: sub,
		})

		// Wait, loc is relative to strTrim. I need to slice original str?
		// TS: match = str.trim().match(...)
		// return match.input.slice(...)
		// But Go doesn't give match.input easily unless I reused strTrim.
		// If I slice strTrim, it works.
		return strTrim[loc[1]:]
	}
	return str
}

func (p *AFDParser) parseTextContent(str string) {
	if str == "" {
		return
	}

	switch p.CurrentContentType {
	case "wwa":
		p.parseWWAContent(str)
	case "tempsTable":
		p.parseTempsTableContent(str)
	default:
		content := normalizeSpaces(strings.ReplaceAll(strings.TrimSpace(str), "\n", " "))
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type:    "text",
			Content: content,
		})
	}
}

func (p *AFDParser) parseWWAContent(str string) {
	currentString := strings.TrimSpace(str)
	// replace(/\n\s+/g, "\n")
	reLines := regexp.MustCompile(`\n\s+`)
	currentString = reLines.ReplaceAllString(currentString, "\n")

	if currentString != "" {
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type:    "text",
			Content: currentString,
		})
	}
}

func (p *AFDParser) parseTempsTableContent(str string) {
	lines := strings.Split(strings.TrimSpace(str), "\n")

	// TS: /[^\d]+(\d+\s+)+\/\s+(\d+\s+)+\d+\s*(\n|$)/g
	// Go doesn't support \s as reliably in all modes? \s is [ \t\n\f\r] usually.
	reTableRow := regexp.MustCompile(`[^\d]+(\d+\s+)+/\s+(\d+\s+)+\d+\s*(\n|$)`)

	tableLines := []string{}
	restOfLines := []string{}

	for _, line := range lines {
		if reTableRow.MatchString(line + "\n") { // Regex expects \n or end. Line doesn't have \n. Added it for match?
			// Actually match string doesn't need \n if it matches $
			if reTableRow.MatchString(line) {
				tableLines = append(tableLines, line)
			} else {
				restOfLines = append(restOfLines, line)
			}
		} else {
			// Redundant check?
			// Need to check exact match logic.
			// TS `line.match(rx)`.
			if reTableRow.MatchString(line) {
				tableLines = append(tableLines, line)
			} else {
				restOfLines = append(restOfLines, line)
			}
		}
	}

	// Process Rows
	rows := []AFDTempsRow{}
	reSplit := regexp.MustCompile(`^([^\d]|\s)*`) // split rx
	reDigits := regexp.MustCompile(`\d+`)
	rePlace := regexp.MustCompile(`^(?P<place>[^\d]+)`)

	for _, line := range tableLines {
		// TS: line.split(rx) -> ... -> numbers
		// Split by leading non-digits?
		// Actually TS logic: `split(rx).filter(...).pop()`
		// `rx` matches the prefix (place name).
		// So split gives ["", "numbers..."].
		parts := reSplit.Split(line, -1)
		// filter items
		validParts := []string{}
		for _, part := range parts {
			// TS: item !== "" || !item.match(/\s+/) ?
			// Actually TS: item !== "" || !item.match(/^\s+$/) check?
			// Usually split results in the parts separated.
			if strings.TrimSpace(part) != "" {
				validParts = append(validParts, part)
			}
		}

		// pop? The last part should be the numbers.
		var numbersStr string
		if len(validParts) > 0 {
			numbersStr = validParts[len(validParts)-1]
		}

		// Parse numbers
		nums := []string{}
		fields := strings.Fields(numbersStr)
		for _, f := range fields {
			if reDigits.MatchString(f) {
				nums = append(nums, f)
			}
		}

		// Place name
		var placeName string
		if match := rePlace.FindStringSubmatch(line); match != nil {
			placeName = strings.TrimSpace(match[1]) // group 1 is place
		}

		rows = append(rows, AFDTempsRow{
			Type:    "temps-table-row",
			Numbers: nums,
			Name:    placeName,
		})
	}

	if len(rows) > 0 {
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type: "temps-table",
			Rows: rows,
		})
	}

	remainingText := strings.TrimSpace(strings.Join(restOfLines, "\n"))
	if remainingText != "" {
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type:    "text",
			Content: remainingText,
		})
	}
}

func (p *AFDParser) parseEpilogueContent(str string) {
	lines := strings.Split(strings.TrimSpace(str), "\n")
	cleanLines := []string{}
	for _, l := range lines {
		cleanLines = append(cleanLines, strings.TrimSpace(l))
	}
	currentString := strings.Join(cleanLines, "\n")
	if currentString != "" {
		p.ParsedNodes = append(p.ParsedNodes, AFDNode{
			Type:    "epilogueText",
			Content: currentString,
		})
	}
}

func (p *AFDParser) splitIntoTopicSections(str string) []string {
	// TS: trimStart().split("&&\n")
	trimmed := strings.TrimLeft(str, " \t\n")
	splits := strings.Split(trimmed, "&&\n")

	valid := []string{}
	reSpace := regexp.MustCompile(`^\s*$`)
	for _, s := range splits {
		if !reSpace.MatchString(s) {
			valid = append(valid, s)
		}
	}
	return valid
}

func normalizeSpaces(str string) string {
	// TS: replace(/( +)|( $)/g, " ")
	re := regexp.MustCompile(`( +)|( $)`)
	return re.ReplaceAllString(str, " ")
}
