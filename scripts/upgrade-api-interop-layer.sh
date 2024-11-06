#!/usr/bin/env bash

if [ -z "$1" ]; then
    echo 'Please specify a new space to create (i.e. lmm)' >&2
    exit 1
fi

# make the api accessible via apps.internal
cf map-route api-weathergov-"$1" apps.internal --hostname api-weathergov-"$1"

# allow access via 61443
cf add-network-policy weathergov-"$1" api-weathergov-"$1" -s "$1" --protocol tcp --port 61443

# remove older route
cf unmap-route api-weathergov-"$1" app.cloud.gov --hostname api-weathergov-"$1"
cf delete-orphaned-routes # or delete the route explicitly
