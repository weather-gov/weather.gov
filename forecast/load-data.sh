#!/usr/bin/env bash
#
# Load spatial data from scratch. This is primarily intended for use in new
# cloud.gov environments.

set -euxo pipefail

./manage.py loadspatial
