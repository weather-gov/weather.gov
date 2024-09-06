#!/usr/bin/env bash

set -euxo pipefail

docker compose exec drupal-test drush user:create uploader --mail='testuser@noaa.com' --password='testpass'
docker compose exec drupal-test drush user:role:add 'uploader' uploader
