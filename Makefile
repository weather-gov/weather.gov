.PHONY: help clear-cache export-config import-config install-site

help:
	@egrep -h '\s##\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

cc: clear-cache
clear-cache: ## Clear and rebuild all Drupal caches (alias cc)
	docker compose exec drupal drush cache:rebuild

export-config: ## Export your current Drupal site's configuration to the config directory
	docker compose exec drupal drush config:export -y

import-config: ## Import the Drupal configuration from the config directory into your site
	docker compose exec drupal drush config:import -y

install-site: ## Install a minimal Drupal site using the configuration in the config directory
	docker compose exec drupal drush site:install minimal --existing-config --account-pass=root -y

own-settings: ## Make the settings.php file writable
	chmod -R 775 drupal/settings.dev.php

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
	