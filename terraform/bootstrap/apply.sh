#!/usr/bin/env bash

if ! command -v terraform &> /dev/null
then
  echo "terraform must be installed before running this script"
  exit 1
fi

set -e

# ensure we're logged in via cli
cf spaces &> /dev/null || cf login -a api.fr.cloud.gov --sso

terraform init
terraform apply "$@"
