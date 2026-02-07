package weather

import (
	"strings"
)

// ParagraphSquash replaces isolated newlines with spaces.
// It detects a newline surrounded by non-newline characters and replaces it with a space.
func ParagraphSquash(str string) string {
	if str == "" {
		return str
	}

	// Pre-allocate builder with exact length since we are replacing 1 char with 1 char.
	var sb strings.Builder
	sb.Grow(len(str))

	n := len(str)
	for i := 0; i < n; i++ {
		b := str[i]
		if b == '\n' {
			// Check if it's an isolated newline:
			// 1. Not at the start (i > 0)
			// 2. Preceded by a non-newline
			// 3. Not at the end (i < n-1)
			// 4. Followed by a non-newline
			if i > 0 && str[i-1] != '\n' && i < n-1 && str[i+1] != '\n' {
				sb.WriteByte(' ')
			} else {
				sb.WriteByte('\n')
			}
		} else {
			sb.WriteByte(b)
		}
	}
	return sb.String()
}
