.PHONY: help clear-cache export-config import-config install-site

help:
	@egrep -h '\s##\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

pause:
	sleep 5

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

import-config: ## Import the Drupal configuration from the config directory into your site
	docker compose exec drupal drush config:import -y

import-content: web/scs-export/* ## Import content from web/scs-export
	for file in $^; do \
		file="$${file#*/}"; \
		docker compose exec drupal drush content:import "$$file"; \
	done

install-site: install-site-config import-content ## Install a minimal Drupal site using the configuration in the config directory and exported content
install-site-config:
	docker compose exec drupal drush site:install minimal --existing-config --account-pass=root -y

log: ## Tail the log for the Drupal container
	docker compose logs --follow drupal

rebuild: ## Delete the Drupal container and rebuild. Does *NOT* delete the site
	docker compose stop drupal
	docker compose rm drupal -f
	docker compose build drupal
	docker compose up -d

reset-site: reset-site-database pause install-site ## Delete the database and rebuild it from configuration and exported content
reset-site-database:
	docker compose stop database
	docker compose rm database -f
	docker compose up -d

shell: ## Get a shell inside the Drupal container
	docker compose exec drupal bash

zap: zap-containers rebuild pause install-site ## Delete the entire Docker environment and start from scratch.
zap-containers:
	docker compose stop
	docker compose rm -f

### Testing
a11y: accessibility-test
accessibility-test: ## Run accessibility tests (alias a11y)
	npx cypress run --project tests/a11y

ee: end-to-end-test
end-to-end-test: ## Run end-to-end tests in Cypress. (alias ee)
	npx cypress run --project tests/e2e

u: unit-test
unit-test: ## Run PHP unit tests
	docker compose exec drupal phpunit --coverage-html /coverage

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
	docker compose exec drupal phpcbf

style-format: ## Format your Sass code according to our style code.
	npm run style-format

### Composer management
ci: composer-install
composer-install: ## Installs dependencies from lock file
	docker compose exec drupal composer install 