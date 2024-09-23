#!/usr/bin/env bash

# This script tears down a Cloud.gov CF Space with all corresponding infrastructure. 
# NOTE: This script was written for MacOS and to be run at the root directory. 

if [ -z "$1" ]; then
    echo 'Please specify a new space to remove (i.e. lmm)' >&2
    exit 1
fi

if [ ! "$(command -v gh)" ] || [ ! "$(command -v jq)" ] || [ ! "$(command -v cf)" ]; then
    echo "jq, cf, and gh packages must be installed. Please install via your preferred manager."
    exit 1
fi

upcase_name=$(printf "%s" "$1" | tr '[:lower:]' '[:upper:]')

read -p "Are you on a new branch? We will have to commit this work. (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    git checkout -b remove-dev-sandbox-"$1"
fi

cf target -o nws-weathergov -s "$1"

read -p "Are you logged in to the nws-weathergov CF org above? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    cf login -a https://api.fr.cloud.gov --sso
fi

gh auth status
read -p "Are you logged into a Github account with access to weather-gov/weather.gov? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    gh auth login
fi

echo "Removing Github keys and service account..."
cf delete-service-key github-cd-account github-cd-key
cf delete-service github-cd-account
gh secret --repo weather-gov/weather.gov remove CF_"${upcase_name}"_USERNAME
gh secret --repo weather-gov/weather.gov remove CF_"${upcase_name}"_PASSWORD

echo "Removing files used for $1..."
rm manifests/manifest-"$1".yaml
sed -i '' "/- $1/d" .github/workflows/deploy-sandbox.yaml

echo "Cleaning up services, applications, and the Cloud.gov space for $1..."
# delete apps
cf delete cronish
cf delete weathergov-"$1"
cf delete proxy-weathergov-"$1"

# delete services
cf delete-service database
cf delete-service secrets
cf delete-service storage
cf delete-service proxy-weathergov-$1

# delete space
cf delete-space "$1"

read -p "All done! Should we open a PR with these changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git add manifests/manifest-"$1".yaml .github/workflows/deploy-sandbox.yaml
    git commit -m "Remove developer sandbox '$1' infrastructure"
    gh pr create
fi
