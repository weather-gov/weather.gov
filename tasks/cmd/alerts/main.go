package main

import (
	"tasks/common"
	"tasks/internal"
	"time"

	"github.com/newrelic/go-agent/v3/newrelic"
)

var newRelicApp *newrelic.Application

func main() {
	logger := common.GetDefaultLogger()
	logger.Info(
		"Hello!",
		"program_name",
		"ALERTS",
	)

	creds, err := internal.GetDatabaseCredentials()
	if err != nil {
		logger.Error("could not get database credentials", "err", err)
	} else {
		// just print something to verify we have it
		logger.Info(creds.Name)
	}

	if internal.IsRunningOnCF() {
		app, nrErr := internal.EnableNewRelic()
		if nrErr != nil {
			logger.Error("could not enable new relic", "err", nrErr)
		} else {
			newRelicApp = app
			defer newRelicApp.Shutdown(10 * time.Second)
		}
	}
}
