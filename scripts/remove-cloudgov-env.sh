# This script tears down a Cloud.gov CF Space with all corresponding infrastructure. 
# NOTE: This script was written for MacOS and to be run at the root directory. 

if [ -z "$1" ]; then
    echo 'Please specify a new space to remove (i.e. lmm)' >&2
    exit 1
fi

if [ ! $(command -v gh) ] || [ ! $(command -v jq) ] || [ ! $(command -v cf) ]; then
    echo "jq, cf, and gh packages must be installed. Please install via your preferred manager."
    exit 1
fi

upcase_name=$(printf "%s" "$1" | tr '[:lower:]' '[:upper:]')

read -p "Are you on a new branch? We will have to commit this work. (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    git checkout -b remove-dev-sandbox-$1
fi

cf target -o cisa-dotgov -s $1

read -p "Are you logged in to the cisa-dotgov CF org above? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    cf login -a https://api.fr.cloud.gov --sso
fi

gh auth status
read -p "Are you logged into a Github account with access to cisagov/getgov? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    gh auth login
fi

echo "Removing Github keys and service account..."
cf delete-service-key github-cd-account github-cd-key
cf delete-service github-cd-account
gh secret --repo cisagov/getgov remove CF_${upcase_name}_USERNAME 
gh secret --repo cisagov/getgov remove CF_${upcase_name}_PASSWORD 

echo "Removing files used for $1..."
rm .github/workflows/deploy-$1.yaml
rm ops/manifests/manifest-$1.yaml
sed -i '' "/getgov-$1.app.cloud.gov/d" src/registrar/config/settings.py
sed -i '' "/- $1/d" .github/workflows/reset-db.yaml
sed -i '' "/- $1/d" .github/workflows/migrate.yaml

echo "Cleaning up services, applications, and the Cloud.gov space for $1..."
cf delete getgov-$1
cf delete-service getgov-$1-database
cf delete-service getgov-credentials
cf delete-space $1

echo "Now you will need to update some things for Login. Please sign-in to https://dashboard.int.identitysandbox.gov/."
echo "Navigate to our application config: https://dashboard.int.identitysandbox.gov/service_providers/2640/edit?"
echo "There are two things to update."
echo "1. You need to remove the public-$1.crt file."
echo "2. You need to remove two redirect URIs: https://getgov-$1.app.cloud.gov/openid/callback/login/ and
https://getgov-$1.app.cloud.gov/openid/callback/logout/ from the list of URIs."
read -p "Please confirm when this is done (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

read -p "All done! Should we open a PR with these changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git add ops/manifests/manifest-$1.yaml .github/workflows/deploy-$1.yaml src/registrar/config/settings.py 
    git commit -m "Remove developer sandbox '"$1"' infrastructure"
    gh pr create
fi


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

