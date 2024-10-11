.PHONY: help clear-cache export-config import-config install-site

help:
	@egrep -h '\s##\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

pause:
	sleep 15

update-settings:
	cp -f web/sites/example.settings.dev.php web/sites/settings.dev.php

### Drupal management
cc: clear-cache
clear-cache: ## Clear and rebuild all Drupal caches (alias cc)
	docker compose exec drupal drush cache:rebuild

dd: database-dump
database-dump: ## Dump the current Drupal database to a the dump.sql file. (alias dd)
	mkdir -p web/config/database
	docker compose exec drupal bash -c '\
	  mysqldump \
	    -h $$DRUPAL_DB_HOST \
	    -u $$DRUPAL_DB_USERNAME \
	    -p$$DRUPAL_DB_PASSWORD \
	    $$DRUPAL_DB_NAME ' > web/config/database/dump.sql

dr: database-restore
database-restore: ## Restore the Drupal database from the dump.sql file (alias dr)
	docker compose exec -it drupal bash -c '\
	  mysql \
	    -h $$DRUPAL_DB_HOST \
	    -u $$DRUPAL_DB_USERNAME \
			-p$$DRUPAL_DB_PASSWORD \
			$$DRUPAL_DB_NAME < web/config/database/dump.sql'

export-config: ## Export your current Drupal site's configuration to the config directory
	docker compose exec drupal drush config:export -y

export-content: ## Export all content to web/scs-export
	rm web/scs-export/*.zip
	docker compose exec drupal drush content:export node scs-export --all-content

# set a docker image variable so that we do not have to duplicate makefile rules for testing.
drupal_image = "drupal"

import-config: ## Import the Drupal configuration from the config directory into your site
	docker compose exec ${drupal_image} drush config:import -y
	docker compose exec ${drupal_image} drush twig:debug on
	docker compose exec ${drupal_image} drush state:set disable_rendered_output_cache_bins 1

import-content: web/scs-export/* ## Import content from web/scs-export
	for file in $^; do \
		file="$${file#*/}"; \
		docker compose exec ${drupal_image} drush content:import "$$file"; \
	done

install-site: install-site-config import-content ## Install a minimal Drupal site using the configuration in the config directory and exported content
install-site-config:
	docker compose exec ${drupal_image} drush site:install minimal --existing-config --account-pass=root -y
	docker compose exec ${drupal_image} drush twig:debug on
	docker compose exec ${drupal_image} drush state:set disable_rendered_output_cache_bins 1

log: ## Tail the log for the Drupal container
	docker compose logs --follow drupal

log-ws: ## tail the Drupal Watchdog logs
	docker compose exec drupal drush watchdog:tail

rebuild: ## Delete the Drupal container and rebuild. Does *NOT* delete the site
	docker compose stop drupal
	docker compose rm drupal -f
	docker compose build drupal --build-arg "UID=$$(id -u)" --build-arg "GID=$$(id -g)"
	docker compose up -d

import-spatial:
ifneq ("spatial-data/dump.mysql","")
	cat spatial-data/dump.mysql | docker compose exec -T database mysql -udrupal -pdrupal -hdatabase weathergov
endif


dump-spatial:
	docker compose exec database mysqldump -udrupal -pdrupal -hdatabase weathergov weathergov_geo_metadata weathergov_geo_states weathergov_geo_counties weathergov_geo_places weathergov_geo_cwas weathergov_geo_zones > spatial-data/dump.mysql

reset-site: reset-site-database pause install-site ## Delete the database and rebuild it from configuration and exported content
reset-site-database:
	docker compose stop database
	docker compose rm database -f
	docker compose up -d

shell: ## Get a shell inside the Drupal container
	docker compose exec drupal bash

ut: update-translations ## Update Drupal from local .po translation files
update-translations:
	docker compose exec drupal drush locale:clear-status
	docker compose exec drupal drush locale:update
	docker compose exec drupal drush cache:rebuild

zap: update-settings dump-spatial zap-containers rebuild pause install-site import-spatial load-spatial  ## Delete the entire Docker environment and start from scratch.
zap-containers:
	docker compose stop
	docker compose rm -f

scorched-earth: ## A tool to reset your Docker Desktop.
	docker stop $$(docker ps -a -q)
	docker rm $$(docker ps -a -q)
	docker system prune -f
	docker volume rm $$(docker volume ls -qf dangling=true)

### CSS
build-css: # Build CSS
	docker compose run --rm uswds npx gulp compile

### Build sprites
build-sprites: # Build sprites
	docker compose run --rm utility-node npm run compile-svg

### Spatial data
load-spatial: # Load spatial data into the database
	docker compose run --rm spatial node load-shapefiles.js

load-spatial-test: # Load spatial data into the test database
	docker compose -f docker-compose.test.yml --profile test run --rm spatial-test node load-shapefiles.js

### Testing
a11y: accessibility-test
accessibility-test: ## Run accessibility tests (alias a11y)
	npx playwright test a11y

be: backend-test
backend-test: ## Run all backend tests. (alias be)
	docker compose exec drupal phpunit --group unit,e2e --process-isolation --coverage-html /coverage  --coverage-clover /coverage/clover.xml

ee: end-to-end-test
end-to-end-test: ## Run end-to-end tests in Cypress. (alias ee)
	npx cypress run --project tests/e2e

eep: end-to-end-playwright
end-to-end-playwright: ## Run Playwright version of e2e tests
	npx playwright test e2e/*

lt: load-time-test
load-time-test: ## Run page load time tests in Cypress (alias lt)
	npx cypress run --project tests/load-times

u: unit-test
unit-test: ## Run PHP unit tests
	docker compose exec drupal phpunit --group unit

start-test-environment: destroy-test-environment
	docker compose -f docker-compose.test.yml --profile test up -d

destroy-test-environment:
	docker compose -f docker-compose.test.yml --profile test down

setup-outside-vars:
	$(eval drupal_image="drupal-test")

ot: outside-test
outside-test: setup-outside-vars start-test-environment pause install-site load-spatial-test ## Run a separate weather.gov instance for testing
	./tests/playwright/outside/setup.sh
	npx playwright test outside/*

### Linting
js-lint: ## Run eslint on our Javascript
	npm run js-lint

lint: js-lint php-lint style-lint ## Lint everything!

php-lint: ## Run PHP_CodeSniffer on our custom modules and themes
	docker compose exec drupal phpcs

style-lint: ## Run scss-lint on our Sass
	npm run style-lint

### Formatting
format: js-format php-format style-format ## Format PHP, JS, and Sass code according to our style guides.

js-format: ## Format JS code according to our style guide.
	npm run js-format

php-format: ## Format your PHP code according to the Drupal PHP language standard
	npm run php-format

style-format: ## Format your Sass code according to our style code.
	npm run style-format

### Other checks
ct: check-translations
check-translations: ## Check the consistency of translations
	npm run check-translations

### Composer management
ci: composer-install
composer-install: ## Installs dependencies from lock file
	docker compose exec drupal composer install 

### Install caddy for uploading manifests: we only need the binary
install-caddy:
	docker cp $$(docker create caddy:2.8.4-alpine):/usr/bin/caddy proxy/caddy
