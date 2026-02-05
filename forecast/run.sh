#!/usr/bin/env bash
#
# We have a sequence of actions to run every time a cloud.gov app starts:
# migrate any pending schema/data changes, collect static files (CSS,
# javascript, and images) to allow Django to efficiently serve up these assets,
# and finally hand over execution to a WSGI server (gunicorn).

set -o errexit
set -o pipefail

# Run pending migrations, if any.
./manage.py migrate

# For translation, compile .po files so that Django can serve translated strings
./manage.py compilemessages

# Ensure that styles and static assets can be served up via STATIC_ROOT.
./manage.py collectstatic --noinput --traceback

# Ensure that spatial data is loaded.
./manage.py loadspatial --cleanup

NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program \
    gunicorn --workers=3 --worker-class=gevent backend.config.wsgi -t 60
