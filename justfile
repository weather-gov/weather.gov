# Recipes with the [script] attribute are currently considered unstable, so we
# need to mark the whole file accordingly
set unstable

# Shows this list 🙂
default:
  just --list

##### Django/django management #####
# Drop all alerts from the alerts cache table
[group("django management")]
clear-alert-cache:
  docker compose exec database bash -c "psql \"postgresql://\$POSTGRES_USER:\$POSTGRES_PASSWORD@database/\$POSTGRES_DB\" -c \"DELETE FROM weathergov_geo_alerts_cache;\""

# Create a Wagtail superuser/admin
[group("django management")]
create-superuser:
  docker compose exec web python manage.py createsuperuser

# Create any new Django migrations, as necessary
[group("django management")]
make-migrations:
  docker compose exec web python manage.py makemigrations

# Apply Django migrations
[group("django management")]
migrate:
  docker compose exec web python manage.py migrate

# Load all static CMS data into Wagtail
[group("django management")]
load-cms-data:
  docker compose exec web python manage.py loaddata backend/wfo_model_dump.json
  docker compose exec web python manage.py loaddata backend/dynamic_safety_info_dump.json

# Restart Django
[group("django management")]
django-restart:
  docker compose restart web

# Get a Python shell in the Django container
[group("django management")]
shell:
  docker compose exec web python manage.py shell

##### Code quality #####
# Lints and formats Python and HTML templates in one go
[group("code quality")]
lint: python-lint template-format template-lint

# Lints Python code
[group("code quality")]
python-lint:
  docker compose exec web python -m black .
  docker compose exec web python -m flake8 .

# Lint the Django HTML templates
[group("code quality")]
template-lint:
  docker compose exec web djlint backend/templates/ --extension=html

# Format the Django HTML templates
[group("code quality")]
template-format:
  docker compose exec web djlint backend/templates/ --reformat --extension=html

##### Dev environment management #####
# Starts up all the containers, prepares the databases, and loads initial data
[group("dev environment management")]
init: && import-spatial load-spatial dump-spatial migrate load-cms-data django-restart
  docker compose up -d
  sleep 15

# Destroys all containers, databases, and volumes and starts over fresh and clean
[group("dev environment management")]
zap: dump-spatial && init
  docker compose down -v

##### Spatial data management #####
# Export spatial data into a SQL dump
[group("spatial")]
[script]
dump-spatial:
  docker compose exec database pg_dump --username=drupal --dbname=weathergov -w -t weathergov_geo_metadata -t weathergov_geo_states -t weathergov_geo_counties -t weathergov_geo_places -t weathergov_geo_cwas -t  weathergov_geo_zones > spatial-data/dump.sql

# Import spatial data from a previous SQL dump
[group("spatial")]
[script]
import-spatial:
  if [[ -f "spatial-data/dump.sql" ]]; then
    cat spatial-data/dump.sql | docker compose exec -T database psql -U drupal -w -d weathergov
  fi

# Load spatial data into the database
[group("spatial")]
load-spatial:
  docker compose run --rm spatial node load-shapefiles.js