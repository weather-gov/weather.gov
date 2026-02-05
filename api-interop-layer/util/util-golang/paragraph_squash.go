package util_golang

import (
	"regexp"
)

var paragraphSquashRegex = regexp.MustCompile(`([^\n])\n([^\n])`)

func ParagraphSquash(str string) string {
	if str == "" {
		return str
	}
	// JS: replace(/([^\n])\n([^\n])/gm, "$1 $2")
	// Go: ReplaceAllString supports $1 expansion.
	return paragraphSquashRegex.ReplaceAllString(str, "$1 $2")
}
