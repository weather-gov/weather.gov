# Recipes with the [script] attribute are currently considered unstable, so we
# need to mark the whole file accordingly
set unstable
set dotenv-load

# Shows this list 🙂
default:
  just --list

# Use a huge version number to compare against. This will get us everything
# between now and the last versioned tag. And this should just keep on working
# until we pass version 10,000. Which... should be a while.
# Get release notes since the last versioned tag
[group("release management")]
[script]
release-notes:
  git remote update
  curl -s -H "PRIVATE-TOKEN: $GITLAB_API_TOKEN" "https://vlab.noaa.gov/gitlab-licensed/api/v4/projects/186/repository/changelog?version=v10000.0.0" | jq -r .notes | sed 's/^## .*//g' | sed 's/(http.*//g' | sed 's/\[//g' | sed 's/\]//g'

[group("system administration")]
[script]
copy-tables-from-beta-to-staging:
  echo "You'll be asked to login twice."
  CF_HOME=$(pwd)/cf-env1 cf login -a api.fr.cloud.gov --sso -o nws-weathergov -s prod
  CF_HOME=$(pwd)/cf-env2 cf login -a api.fr.cloud.gov --sso -o nws-weathergov -s staging
  echo "⚠︎ Deleting existing data in staging. ⚠︎"
  CF_HOME=$(pwd)/cf-env2 cf ssh weathergov-staging -c "/tmp/lifecycle/launcher /home/vcap/app \"./manage.py shell -c 'from wagtail.models import Page; Page.objects.all().delete()'\" '{}'"
  CF_HOME=$(pwd)/cf-env2 cf ssh weathergov-staging -c "/tmp/lifecycle/launcher /home/vcap/app \"./manage.py shell -c 'from django.apps import apps; [ model.objects.all().delete() for model in list(apps.get_app_config(\\\"wagtailcore\\\").get_models()) ]'\" '{}'"
  echo "⚠︎ Copying data from beta now. ⚠︎"
  CF_HOME=$(pwd)/cf-env1 cf ssh weathergov-prod -t -c "/tmp/lifecycle/launcher /home/vcap/app './manage.py dumpdata --natural-foreign --natural-primary --exclude=wagtailcore.ModelLogEntry wagtailcore backend taggit' '{}'" | jq -R 'fromjson?' | CF_HOME=$(pwd)/cf-env2 cf ssh weathergov-staging -c "/tmp/lifecycle/launcher /home/vcap/app './manage.py loaddata --format=json -i -' '{}'"
  rm -r "$(pwd)/cf-env1" "$(pwd)/cf-env2"

# Build USWDS and our styles together
[group("building")]
css:
  docker compose run --rm uswds npx --no-install gulp compile

# Build SVG assets that are assembled programmatically
[group("building")]
svg:
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}/forecast/frontend":"/app/forecast/frontend" \
    -v "{{justfile_directory()}}/scripts:/app/scripts" \
    node \
    node ./scripts/compile-svg-sprite.js \
      forecast/frontend/assets/images/weather/icons/*.svg \
      forecast/frontend/assets/images/weather/icons/conditions/*.svg

# Serve the documentation
[group("building")]
serve-docs:
  docker compose --profile utility up docs

# Update README code organization
readme-code-org:
  npm run update-code-org

##### Django/django management #####
# Generate static assets
[group("django management")]
collectstatic:
  docker compose exec web python manage.py collectstatic

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

# Compile translations
[group("django management")]
compile-translations:
  docker compose exec web python manage.py compilemessages

# Restart Django
[group("django management")]
django-restart:
  docker compose restart web

# Load spatial data; pass "clean" for clean load
[group("django management")]
[script]
load-spatial arg="":
  if [ "{{arg}}" = "clean" ]; then
    docker compose exec web python manage.py loadspatial --force
  else
    docker compose exec web python manage.py loadspatial
  fi

# Get a Python shell in the Django container
[group("django management")]
shell:
  docker compose exec web python manage.py shell

# Compile translation messages
[group("django management")]
compile-messages:
  docker compose exec web python manage.py compilemessages

##### Caching #####
# Drop all alerts from the alerts cache table
[group("cache management")]
clear-alert-cache:
  docker compose exec database bash -c "psql \"postgresql://\$POSTGRES_USER:\$POSTGRES_PASSWORD@database/\$POSTGRES_DB\" -c \"DELETE FROM weathergov_geo_alerts_cache;\""

##### Code quality #####
# Format Javascript
[group("code quality")]
format-js:
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}/.prettierignore":"/app/.prettierignore" \
    -v "{{justfile_directory()}}/prettier.config.js":"/app/prettier.config.js" \
    -v "{{justfile_directory()}}/api-interop-layer":"/app/api-interop-layer" \
    -v "{{justfile_directory()}}/api-proxy":"/app/api-proxy" \
    -v "{{justfile_directory()}}/tests":"/app/tests" \
    -v "{{justfile_directory()}}/spatial-data":"/app/spatial-data" \
    -v "{{justfile_directory()}}/forecast/frontend":"/app/forecast/frontend" \
    node \
    npx --no-install prettier -w 'forecast/frontend/**/assets/**/*.js' 'tests/**/*.js' '*.js' 'api-interop-layer/**/*.js'

# Format Python code
[group("code quality")]
format-python:
  docker compose exec web python -m ruff format .

# Format stylesheets
[group("code quality")]
format-style:
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}/forecast/frontend":"/app" \
    node \
    npx --no-install prettier -w ./**/*.scss

# Format the Django HTML templates
[group("code quality")]
[script]
format-template file="":
  if [[ -z "{{file}}" ]]; then
    docker compose exec web djlint backend/templates/ --reformat --extension=html
  else
    docker compose exec web djlint {{file}} --reformat --extension=html
  fi

# Lints and formats Python and HTML templates in one go
[group("code quality")]
lint: format-js lint-js format-python lint-python format-template lint-template format-style lint-style

# Lint Javascript
[group("code quality")]
lint-js:
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}/eslint.config.js":"/app/eslint.config.js" \
    -v "{{justfile_directory()}}/api-interop-layer":"/app/api-interop-layer" \
    -v "{{justfile_directory()}}/api-proxy":"/app/api-proxy" \
    -v "{{justfile_directory()}}/tests":"/app/tests" \
    -v "{{justfile_directory()}}/spatial-data":"/app/spatial-data" \
    -v "{{justfile_directory()}}/forecast/frontend":"/app/forecast/frontend" \
    node \
    npx --no-install eslint --fix

# Lints Python code
[group("code quality")]
lint-python:
  docker compose exec web python -m ruff check --fix .

# Lint Sass stylesheets
[group("code quality")]
lint-style:
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}":"/app" \
    node \
    npx --no-install stylelint **/*.scss --fix

# Lint the Django HTML templates
[group("code quality")]
lint-template:
  docker compose exec web djlint backend/templates/ --extension=html

##### Testing #####
alias a11y := test-a11y
# Run automated accessibility testing in Playwright
[group("testing")]
test-a11y:
  docker compose \
    run --rm \
    playwright \
    npx --no-install playwright test --output /reports/a11y a11y

# Run Django tests
[group("testing")]
[script]
test-django arg="":
  if [ "{{arg}}" == "debug" ]; then
    docker compose \
      run --rm \
      -v "{{justfile_directory()}}/reports/django":"/reports" \
      -e BREAK=true \
      -e DEBUG_PORT=34532 \
      -p "34532:34532" \
      web \
      bash -c "coverage run manage.py test backend spatial noaa_saml wx_stories_api; coverage html -d /reports"
  else
    docker compose \
      run --rm \
      -v "{{justfile_directory()}}/reports/django":"/reports" \
      web \
      bash -c "coverage run manage.py test backend spatial noaa_saml wx_stories_api; coverage html -d /reports"
  fi

alias ee := test-e2e
# Run end-to-end browser testing in Playwright
[group("testing")]
test-e2e:
  docker compose \
  run --rm \
  playwright \
  npx --no-install playwright test --output /reports/end-to-end e2e

# Test the interop layer. Add "debug" to break for a debugger.
[group("testing")]
[script]
test-interop arg="":
  inspect=""
  if [ "{{arg}}" == "debug" ]; then
    inspect="--inspect-brk=0.0.0.0:2992"
  fi
  docker compose \
    run --rm \
    -v "{{justfile_directory()}}/reports/interop":"/reports" \
    -e LOG_LEVEL=trace \
    -p "2992:2992" \
    api-interop-layer \
    npx --no-install c8 --all \
      --exclude "ecosystem.*.config.cjs" \
      --exclude "main.js" \
      --reporter html \
      --reporter clover -o /reports \
      mocha '**/*.test.js' \
        --exclude 'node_modules/**' \
        --require mocha.js \
        $inspect

alias wc := test-web-components
# Run web component testing
[group("testing")]
test-web-components:
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}/reports/web-components":"/reports" \
    -v "{{justfile_directory()}}/forecast/frontend":"/app/frontend" \
    node \
    npx --no-install c8 --reporter html --reporter clover -o /reports mocha \
      --require frontend/tests/components/preload.js \
      frontend/tests/components/**/*-tests.js

##### Dev environment management #####
# Starts up all the containers, prepares the databases, and loads initial data
[group("dev environment management")]
init: && migrate load-spatial django-restart
  docker compose up -d
  sleep 15

# Starts a PlantUML server container listening on localhost:8180
[group("dev environment management")]
plantuml:
  docker compose --profile utility start plantuml

# Rebuild a specific container, or all of them!
[group("dev environment management")]
rebuild target="":
  docker compose stop {{ target }} && docker compose rm -f {{ target }} && docker compose build {{ target }} && docker compose up -d


# Stops the PlantUML server
[group("dev environment management")]
stop-plantuml:
  docker compose --profile utility stop plantuml

# Destroys all containers, databases, and volumes and starts over fresh and clean
[group("dev environment management")]
zap: && init
  docker compose down -v

alias scorched-earth := controlled-burn
# Does what zap does, plus destroys spatial data and docker images
[group("dev environment management")]
controlled-burn: && init
  docker compose down -v --rmi all

# Load just states spatial data.
[group("spatial data loading")]
load-states:
  docker compose exec web python manage.py loadspatial --states
# Load just CWA spatial data.
[group("spatial data loading")]
load-cwas:
  docker compose exec web python manage.py loadspatial --cwas
# Load just counties spatial data.
[group("spatial data loading")]
load-counties:
  docker compose exec web python manage.py loadspatial --counties
# Load just zones spatial data.
[group("spatial data loading")]
load-zones:
  docker compose exec web python manage.py loadspatial --zones
# Load just place spatial data.
[group("spatial data loading")]
load-places:
  docker compose exec web python manage.py loadspatial --places
