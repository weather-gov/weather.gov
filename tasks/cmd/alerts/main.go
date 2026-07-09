package main

import "tasks/common"

func main() {
	logger := common.GetDefaultLogger()
	logger.Info(
		"Hello!",
		"program_name",
		"ALERTS",
	)
}
