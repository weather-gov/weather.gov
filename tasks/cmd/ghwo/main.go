package main

import (
	"tasks/common"
)

func main() {
	logger := common.GetJSONLogger()
	logger.Info(
		"Hello!",
		"program_name",
		"GHWO",
	)
}
