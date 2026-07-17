package internal

import (
	"fmt"
	"os"

	"github.com/newrelic/go-agent/v3/newrelic"
)

func EnableNewRelic() (*newrelic.Application, error) {
	space := os.Getenv("CLOUDGOV_SPACE")
	if space == "" {
		space = "dev"
	}
	newRelicKey := os.Getenv("NEW_RELIC_LICENSE_KEY")
	if newRelicKey == "" {
		return nil, fmt.Errorf("New Relic key was not found")
	}
	app, err := newrelic.NewApplication(
		newrelic.ConfigAppName(fmt.Sprintf("tasks-%s", space)),
		newrelic.ConfigLicense(newRelicKey),
		newrelic.ConfigDebugLogger(os.Stdout),
		func(cfg *newrelic.Config) {
			cfg.CustomInsightsEvents.Enabled = false
		},
	)
	if err != nil {
		return nil, fmt.Errorf("unable to initialize New Relic: %w", err)
	}
	return app, nil
}
