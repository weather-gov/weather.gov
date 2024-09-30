#!/usr/bin/env bash
#
# commands to set up our test environment programatically

set -euxo pipefail

# create an `uploader` user for API testing
docker compose exec drupal-test drush user:create uploader --mail='testuser@noaa.com' --password='testpass'
docker compose exec drupal-test drush user:role:add 'uploader' uploader
