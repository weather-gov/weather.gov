#!/bin/sh
#
# This script will attempt to clean up the drupal install in cloud.gov
#

# delete apps
cf delete cronish
cf delete weather

# delete services
cf delete-service database
cf delete-service secrets
cf delete-service storage

