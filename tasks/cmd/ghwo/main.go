package main

import (
	"tasks/internal"
)

func main() {
	logger := internal.GetJSONLogger()
	logger.Info(
		"Hello!",
		"program_name",
		"GHWO",
	)
}
