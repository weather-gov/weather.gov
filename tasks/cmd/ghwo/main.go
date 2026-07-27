package main

import (
	"tasks/internal"
)

func main() {
	logger := internal.GetJSONLogger("ghwo")
	logger.Info(
		"Hello!",
		"program_name",
		"GHWO",
	)
}
