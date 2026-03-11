#!/usr/bin/env bash
#
# We have a sequence of actions to run every time a cloud.gov app starts:
# migrate any pending schema/data changes, make sure spatial data is up to date,
# and finally hand over execution to a WSGI server (gunicorn).

set -o errexit
set -o pipefail

# Run pending migrations, if any.
./manage.py migrate

# Ensure that spatial data is loaded.
./manage.py loadspatial --cleanup

NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program \
    gunicorn --workers=3 --worker-class=gevent backend.config.wsgi -t 60
