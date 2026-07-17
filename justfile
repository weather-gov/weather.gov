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

# Export packages from pyproject.toml to requirements.txt
[group("building")]
uv:
  docker compose exec web bash -c "pip install uv && uv export --no-dev --format requirements.txt>requirements.txt"

# Export dev packages from pyproject.toml to requirements.txt
[group("building")]
uv-dev:
  docker compose exec web bash -c "pip install uv && uv export --group dev --format requirements.txt>requirements.dev.txt"

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

# Restart Django
[group("django management")]
django-restart:
  docker compose restart web

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
  docker compose exec database bash -c "psql \"postgresql://\$POSTGRES_USER:\$POSTGRES_PASSWORD@database/\$POSTGRES_DB\" -c \"UPDATE weathergov_geo_alerts_cache SET hash=id,alertjson=jsonb_set(alertjson::jsonb,'{hash}',quote_ident(id::text)::jsonb);\""
  docker compose restart api-interop-layer

##### Code quality #####
# Format Javascript
[group("code quality")]
[script]
format-js *files:
  if [[ -z "{{files}}" ]]; then
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
      npx --no-install prettier -w --list-different 'forecast/frontend/**/assets/**/*.js' 'tests/**/*.js' '*.js' 'api-interop-layer/**/*.js'
  else
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
      npx --no-install prettier -w --list-different {{files}}
  fi

# Format Python code
[group("code quality")]
[script]
format-python *files:
  if [[ -z "{{files}}" ]]; then
    target="."
  else
    target="{{files}}"
  fi
  docker compose exec web python -m ruff format $target

# Format stylesheets
[group("code quality")]
[script]
format-style *files:
  if [[ -z "{{files}}" ]]; then
    target="./**/*.scss"
  else
    target="{{files}}"
  fi
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}/forecast/frontend":"/app" \
    node \
    npx --no-install prettier -w --list-different $target

# Format the Django HTML templates
[group("code quality")]
[script]
format-template *files:
  if [[ -z "{{files}}" ]]; then
    docker compose exec web djlint backend/templates/ --reformat --extension=html || true
  else
    docker compose exec web djlint {{files}} --reformat --extension=html || true
  fi

# Lints and formats Python and HTML templates in one go
[group("code quality")]
lint: format-js lint-js format-python lint-python format-template lint-template format-style lint-style

# Lint Javascript
[group("code quality")]
[script]
lint-js *files:
  if [[ -z "{{files}}" ]]; then
    target=""
  else
    target="{{files}}"
  fi
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}/eslint.config.js":"/app/eslint.config.js" \
    -v "{{justfile_directory()}}/api-interop-layer":"/app/api-interop-layer" \
    -v "{{justfile_directory()}}/api-proxy":"/app/api-proxy" \
    -v "{{justfile_directory()}}/tests":"/app/tests" \
    -v "{{justfile_directory()}}/spatial-data":"/app/spatial-data" \
    -v "{{justfile_directory()}}/forecast/frontend":"/app/forecast/frontend" \
    node \
    npx --no-install eslint --fix $target

# Lints Python code
[group("code quality")]
[script]
lint-python *files:
  if [[ -z "{{files}}" ]]; then
    target="."
  else
    target="{{files}}"
  fi
  docker compose exec web python -m ruff check --fix $target

# Lint Sass stylesheets
[group("code quality")]
[script]
lint-style *files:
  if [[ -z "{{files}}" ]]; then
    target="**/*.scss"
  else
    target="{{files}}"
  fi
  docker compose --profile utility \
    run --rm \
    -v "{{justfile_directory()}}":"/app" \
    node \
    npx --no-install stylelint $target --fix

# Lint the Django HTML templates
[group("code quality")]
[script]
lint-template *files:
  if [[ -z "{{files}}" ]]; then
    target="backend/templates/"
  else
    target="{{files}}"
  fi
  docker compose exec web djlint $target --extension=html

[group("code quality")]
gitlab-sast:
  docker run --rm \
  -v "$PWD:/tmp/app" \
  -w /tmp/app \
  -e SAST_EXCLUDED_PATHS="spec,test,tests,tmp,forecast/frontend/assets/js/uswds*.js,forecast/frontend/assets/js/third-party,forecast/frontend/assets/js/cmi-radar*.js,forecast/frontend/public/js" \
  registry.gitlab.com/security-products/semgrep:latest /analyzer run && \
  cat gl-sast-report.json | jq ".vulnerabilities[].name" | sort | uniq -c

[group("code quality")]
lint-docker:
    hadolint ./tasks/Dockerfile

# Run goimports on the files in the tasks directory
[group("code quality")]
go-imports:
    docker compose run --rm tasks-dev go run golang.org/x/tools/cmd/goimports@latest -w .

# Run go vet across all packages
[group("code quality")]
go-vet:
    docker compose run --rm tasks-dev go vet ./...

##### Testing #####
alias a11y := test-a11y
# Run automated accessibility testing in Playwright
[group("testing")]
test-a11y:
  docker compose \
    run --rm \
    playwright \
    npx --no-install playwright test --output /reports/a11y a11y

# Run collectstatic which is required for Django tests
[group("testing")]
test-collectstatic:
  docker compose run --rm web python manage.py collectstatic --noinput

# Run Django tests
[group("testing")]
[script]
test-django arg="": test-collectstatic
  if [ "{{arg}}" == "debug" ]; then
    docker compose \
      run --rm \
      -v "{{justfile_directory()}}/reports/django":"/reports" \
      -e BREAK=true \
      -e DEBUG_PORT=34532 \
      -p "34532:34532" \
      web \
      bash -c "coverage run manage.py test backend spatial noaa_saml; coverage html -d /reports"
  else
    docker compose \
      run --rm \
      -v "{{justfile_directory()}}/reports/django":"/reports" \
      web \
      bash -c "coverage run manage.py test backend spatial noaa_saml; coverage html -d /reports"
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
    -e LOG_LEVEL=silent \
    -e DISABLE_REDIS=true \
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

# Load spatial data; pass "clean" for clean load
[group("spatial data loading")]
[script]
load-spatial arg="": && clear-alert-cache
  if [ "{{arg}}" = "clean" ]; then
    docker compose exec web python manage.py loadspatial --force
  else
    docker compose exec web python manage.py loadspatial
  fi
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
load-counties: && clear-alert-cache
  docker compose exec web python manage.py loadspatial --counties
# Load just zones spatial data.
[group("spatial data loading")]
load-zones: && clear-alert-cache
  docker compose exec web python manage.py loadspatial --zones
# Load just place spatial data.
[group("spatial data loading")]
load-places:
  docker compose exec web python manage.py loadspatial --places
# Load grid points
[group("spatial data loading")]
load-gridpoints path:
  docker compose exec web python manage.py loadgridpoints /code/{{path}}

[group("logging")]
logs:
  docker compose logs -f fluent-bit

# Run any command in the go container. All args passed through
# Example: just lets go run <something>
[group("golang")]
lets *args:
    docker compose run --rm tasks-dev {{args}}

# Run the GHWO program  without compiling (interpreted)
[group("golang")]
go-run-ghwo:
    docker compose run --rm tasks-dev go run /tasks/cmd/ghwo/main.go

# Run the alerts program without compiling (interpreted)
[group("golang")]
go-run-alerts:
    docker compose run --rm tasks-dev go run /tasks/cmd/alerts/main.go

# Compile the GHWO program
[group("golang")]
go-build-ghwo:
    docker compose run --rm tasks-dev go build -o /tasks/bin/ghwo /tasks/cmd/ghwo/main.go

# Compile the alerts program
[group("golang")]
go-build-alerts:
    docker compose run --rm tasks-dev go build -o /tasks/bin/alerts /tasks/cmd/alerts/main.go

# Compile all programs
[group("golang")]
go-build-check:
    docker compose run --rm tasks-dev go build ./...

# Run all the tests
[group("golang")]
go-test:
    docker compose run --rm tasks-dev go test -v ./...

alias test-go := go-test
