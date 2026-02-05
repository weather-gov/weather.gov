package util_golang

import (
	"regexp"
	"strings"
)

var (
	sentenceCaseRegex = regexp.MustCompile(` [A-Z]`)
	titleCaseRegex    = regexp.MustCompile(`\w\S*`)
)

func SentenceCase(str string) string {
	if str == "" {
		return str
	}
	return sentenceCaseRegex.ReplaceAllStringFunc(str, func(match string) string {
		return strings.ToLower(match)
	})
}

func TitleCase(str string) string {
	if str == "" {
		return str
	}
	// caser := cases.Title(language.English) // This line was commented out and the imports are removed.
	return titleCaseRegex.ReplaceAllStringFunc(str, func(match string) string {
		// JS logic: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
		// cases.Title does exactly that for words mostly, but let's be strict to JS logic
		// if we use cases.Title it handles 'word' -> 'Word'.
		// But JS regex \w\S* matches "word-with-hyphen" as one token?
		// \w matches [a-zA-Z0-9_]. \S matches non-whitespace.
		// "foo-bar" matches: \w is f, \S* is oo-bar. So "foo-bar".
		// JS TitleCase "foo-bar" -> "Foo-bar"?
		// Let's verify JS behavior: "foo-bar".charAt(0).toUpperCase() -> F. slice(1).toLower() -> oo-bar.
		// So "Foo-bar".
		// cases.Title("foo-bar") -> "Foo-Bar" usually?
		// Let's implement manually to match JS exactly for now.
		if len(match) == 0 {
			return match
		}
		return strings.ToUpper(string(match[0])) + strings.ToLower(match[1:])
	})
}
