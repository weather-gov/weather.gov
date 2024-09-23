#!/usr/bin/env bash

# This script sets up a completely new Cloud.gov CF Space with all the corresponding
# infrastructure needed to run weather.gov. It can serve for documentation for running
# NOTE: This script was written for MacOS and to be run at the root directory. 

# A function to generate a random string, used for cron key, password, etc.
generate_string()
{
  if [ -z "$1" ] ; then
    if command -v uuidgen >/dev/null ; then
      NEW_STRING=$(uuidgen)
      export NEW_STRING
    else
      echo "cannot find uuidgen utility:  You will need to generate some random strings and put them in the CRON_KEY, HASH_SALT, and ROOT_USER_PASS environment variables, then re-run this script."
      exit 1
    fi
  fi
}

if [ -z "$1" ]; then
    echo 'Please specify a new space to create (i.e. lmm)' >&2
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
    git checkout -b new-dev-sandbox-"$1"
fi

cf target -o nws-weathergov

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

echo "Creating manifest for $1..."
cp manifests/manifest.template.yaml manifests/manifest-"$1".yaml
sed -i '' "s/ENVIRONMENT/$1/" "manifests/manifest-$1.yaml"

echo "Creating new cloud.gov space for $1..."
cf create-space "$1"
cf target -o "nws-weathergov" -s "$1"
cf bind-security-group public_networks_egress nws-weathergov --space "$1"
cf bind-security-group trusted_local_networks_egress nws-weathergov --space "$1"

echo "Creating new cloud.gov DB for '$1'. This usually takes about 5 minutes..."
cf create-service aws-rds small-mysql database

until cf service database | grep -q 'The service instance status is succeeded'
do
  echo "Database not up yet, waiting..."
  sleep 30
done

echo "Creating storage for file uploads in '$1'..."
cf create-service s3 basic-sandbox storage

echo "Creating new cloud.gov credentials for '$1'..."
generate_string "$CRON_KEY"
CRON_KEY=${CRON_KEY:-$NEW_STRING}
generate_string "$HASH_SALT"
HASH_SALT=${HASH_SALT:-$NEW_STRING}
generate_string "$ROOT_USER_PASS"
ROOT_USER_PASS=${ROOT_USER_PASS:-$NEW_STRING}
ROOT_USER_NAME=${ROOT_USER_NAME:-root}

# Note: SAML will not actually work until the new domain is added to the cert, but setting up everything else regardless...
echo "Grabbing SAML cert from beta..."
cf target -o nws-weathergov -s prod
SP_PUBLIC_KEY=$(cf env weathergov-beta | sed -n '/VCAP_SERVICES/,/VCAP_APPLICATION/p' |  sed '$d' |  sed '1s;^;{\n;' | sed '$s/$/}/' | sed 's/VCAP_SERVICES/"VCAP_SERVICES"/g' | jq -r '."VCAP_SERVICES"."user-provided"[].credentials.SP_PUBLIC_KEY')
SP_PRIVATE_KEY=$(cf env weathergov-beta | sed -n '/VCAP_SERVICES/,/VCAP_APPLICATION/p' |  sed '$d' |  sed '1s;^;{\n;' | sed '$s/$/}/' | sed 's/VCAP_SERVICES/"VCAP_SERVICES"/g' | jq -r '."VCAP_SERVICES"."user-provided"[].credentials.SP_PRIVATE_KEY')
IDP_PUBLIC_KEY=$(cf env weathergov-beta | sed -n '/VCAP_SERVICES/,/VCAP_APPLICATION/p' |  sed '$d' |  sed '1s;^;{\n;' | sed '$s/$/}/' | sed 's/VCAP_SERVICES/"VCAP_SERVICES"/g' | jq -r '."VCAP_SERVICES"."user-provided"[].credentials.IDP_PUBLIC_KEY')
NEWRELIC_LICENSE=$(cf env weathergov-beta | sed -n '/VCAP_SERVICES/,/VCAP_APPLICATION/p' |  sed '$d' |  sed '1s;^;{\n;' | sed '$s/$/}/' | sed 's/VCAP_SERVICES/"VCAP_SERVICES"/g' | jq -r '."VCAP_SERVICES"."user-provided"[].credentials.NEWRELIC_LICENSE')
cf target -o nws-weathergov -s "$1"

jq -n --arg cron_key "$CRON_KEY" --arg hash_salt "$HASH_SALT" --arg root_user_name "$ROOT_USER_NAME" --arg root_user_pass "$ROOT_USER_PASS" --arg sp_public_key "$SP_PUBLIC_KEY" --arg sp_private_key "$SP_PRIVATE_KEY" --arg idp_public_key "$IDP_PUBLIC_KEY" --arg newrelic_license "$NEWRELIC_LICENSE" '{"CRON_KEY":$cron_key,"HASH_SALT":$hash_salt,"SP_PUBLIC_KEY":$sp_public_key,"SP_PRIVATE_KEY":$sp_private_key,"IDP_PUBLIC_KEY":$idp_public_key,"ROOT_USER_PASS":$root_user_pass,"ROOT_USER_NAME":$root_user_name,"NEWRELIC_LICENSE":$newrelic_license}' > credentials-"$1".json
cf cups secrets -p credentials-"$1".json

echo "Database create succeeded and credentials created. Deploying the weather.gov application to the new space $1..."
cf push -f manifests/manifest-"$1".yaml --var newrelic-license="$NEWRELIC_LICENSE"

echo "Creating credentials to talk to storage in $1..."
cf create-service-key storage storagekey
S3INFO=$(cf service-key storage storagekey)
S3_BUCKET=$(echo "$S3INFO" | grep '"bucket":' | sed 's/.*"bucket": "\(.*\)",/\1/')
S3_REGION=$(echo "$S3INFO" | grep '"region":' | sed 's/.*"region": "\(.*\)",/\1/')
cf set-env weathergov-"$1" S3_BUCKET "$S3_BUCKET"
cf set-env weathergov-"$1" S3_REGION "$S3_REGION"
cf delete-service-key storage storagekey -f
cf restart weathergov-"$1"

read -p "Please provide the email of the space developer: " -r
cf set-space-role "$REPLY" nws-weathergov "$1" SpaceDeveloper

echo "Running post-deploy script in $1..."
cf run-task weathergov-"$1" --command "./scripts/post-deploy.sh" --name "weathergov-$1-deploy" -k "2G" -m "256M"

echo "Doing initial content import in $1..."
cf run-task weathergov-"$1" --command "./scripts/import-content.sh" --name "weathergov-$1-content-import" -k "2G" -m "256M"

echo "Running spatial scripts in $1..." 
./scripts/load-spatial-data.sh "$1"

echo "Alright, your app is up and running at https://weathergov-$1.app.cloud.gov!"
echo
echo "Moving on to setup Github automation..."

echo "Adding new environment to Github Actions..."
sed -i '' '/        options:/ {a\
          - '"$1"'
}' .github/workflows/deploy-sandbox.yaml

cat >> .github/workflows/new-relic-deployment.yaml << EOF

  newrelic-$1:
    if: \${{ inputs.environment == '$1' }}
    runs-on: ubuntu-latest
    name: New Relic Record Deployment
    steps:
      - name: Set Release Version from Tag
        run: echo "RELEASE_VERSION=\${{ github.ref_name }}" >> \$GITHUB_ENV

      - name: Add New Relic Application Deployment Marker
        uses: newrelic/deployment-marker-action@v2.5.0
        with:
          apiKey: \${{ secrets.NEW_RELIC_API_KEY }}
          guid: \${{ secrets.NEW_RELIC_${upcase_name}_DEPLOYMENT_ENTITY_GUID }}
          version: "\${{ env.RELEASE_VERSION }}"
          user: "\${{ github.actor }}"
EOF

echo "Creating space deployer for Github deploys..."
cf create-service cloud-gov-service-account space-deployer github-cd-account
cf create-service-key github-cd-account github-cd-key
cf service-key github-cd-account github-cd-key
read -p "Please confirm we should set the above username and key to Github secrets. (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

cf service-key github-cd-account github-cd-key | sed 1,2d  | jq -r '[.username, .password]|@tsv' | 
while read -r username password; do
    gh secret --repo weather-gov/weather.gov set CF_"${upcase_name}"_USERNAME --body "$username"
    gh secret --repo weather-gov/weather.gov set CF_"${upcase_name}"_PASSWORD --body "$password"
done

read -p "Please provide the GUID for the $1 application from New Relic: " -r
gh secret --repo weather-gov/weather.gov set NEW_RELIC_"${upcase_name}"_DEPLOYMENT_ENTITY_GUID --body "$REPLY"

read -p "All done! Should we open a PR with these changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git add manifests/manifest-"$1".yaml .github/workflows/
    git commit -m "Add new developer sandbox '$1' infrastructure"
    gh pr create
fi
