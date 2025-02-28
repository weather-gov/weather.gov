zap: containers-up pause import-spatial load-spatial migrate load-wfo-data load-safety-data dump-spatial pause django-restart
rezap: dump-spatial zap

import-spatial:
ifneq ("spatial-data/dump.sql","")
	cat spatial-data/dump.sql | docker compose exec -T database psql -U drupal -w -d weathergov
endif

### Spatial data
load-spatial: # Load spatial data into the database
	docker compose run --rm spatial node load-shapefiles.js

dump-spatial:
	docker compose exec database pg_dump --username=drupal --dbname=weathergov -w -t weathergov_geo_metadata -t weathergov_geo_states -t weathergov_geo_counties -t weathergov_geo_places -t weathergov_geo_cwas -t  weathergov_geo_zones > spatial-data/dump.sql

update-settings:
	cp -f web/sites/example.settings.dev.php web/sites/settings.dev.php

zap-containers:
	docker compose stop
	docker compose rm -f

containers-up:
	docker compose up -d

django-restart:
	docker compose restart web

pause:
	sleep 15

build-css: # Build CSS
	docker compose run --rm uswds npx gulp compile

python-lint:
	docker compose exec web python -m black .
	docker compose exec web python -m flake8 .

template-lint:
	docker compose exec web djlint backend/templates/ --extension=html

template-format:
	docker compose exec web djlint backend/templates/ --reformat --extension=html

lint: python-lint template-format template-lint

migrate:
	docker compose exec web python manage.py migrate

make-migrations:
	docker compose exec web python manage.py makemigrations

mm: make-migrations

load-wfo-data:
	docker compose exec web python manage.py loaddata backend/wfo_model_dump.json

dump-wfo-data:
	docker compose exec web python manage.py dumpdata backend.Region backend.WFO > forecast/backend/wfo_model_dump.json

load-safety-data:
	docker compose exec web python manage.py loaddata backend/dynamic_safety_info_dump.json

createsuperuser:
	docker compose exec web python manage.py createsuperuser

shell:
	docker compose exec web python manage.py shell
