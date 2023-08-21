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

own-settings: ## Make the settings.php file writable
	chmod -R 775 settings.php

rebuild: ## Delete the Drupal container and rebuild. Does *NOT* delete the site
	docker compose stop drupal
	docker compose rm drupal -f
	docker compose build drupal
	docker compose up -d

shell: ## Get a shell inside the Drupal container
	docker compose exec drupal bash

zap: ## Delete the entire Docker environment and start from scratch.
	docker compose stop
	docker compose rm -f
	docker compose build
	docker compose up -d
	