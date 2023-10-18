.PHONY: help clear-cache export-config import-config install-site

help:
	@egrep -h '\s##\s' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

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
	docker compose exec drupal drush content:export node scs-export --all-content

format: ## Format your code according to the Drupal PHP language standard
	docker compose exec drupal phpcbf

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

lint: ## Run PHP_CodeSniffer on our custom modules and themes
	docker compose exec drupal phpcs

pause:
	sleep 5

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

u: unit-test
unit-test: ## Run PHP unit tests
	docker compose exec drupal phpunit --coverage-html /coverage

zap: zap-containers rebuild pause install-site ## Delete the entire Docker environment and start from scratch.
zap-containers:
	docker compose stop
	docker compose rm -f