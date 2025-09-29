#!/usr/bin/env bash
#
# Load WFO, safety information, and spatial data from scratch. This is primarily
# intended for use in new cloud.gov environments.

set -euxo pipefail

./manage.py loaddata backend/wfo_model_dump.json
./manage.py loaddata backend/dynamic_safety_info_dump.json
./manage.py loadspatial
