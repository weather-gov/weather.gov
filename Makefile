.PHONY: help clear-cache export-config import-config install-site

help: ## Show this help
	@egrep -h '\s##\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

clear-cache: ## Clear and rebuild all Drupal caches
	docker compose run --rm clear-cache

export-config: ## Export your current Drupal site's configuration to the config directory
	docker compose run --rm export-config

import-config: ## Import the Drupal configuration from the config directory into your site
	docker compose run --rm import-config

install-site: ## Install a minimal Drupal site using the configuration in the config directory
	docker compose run --rm install-site
