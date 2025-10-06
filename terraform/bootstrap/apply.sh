#!/usr/bin/env bash

if ! command -v terraform &> /dev/null
then
  echo "terraform must be installed before running this script"
  exit 1
fi

set -e

# ensure we're logged in via cli
cf spaces &> /dev/null || cf login -a api.fr.cloud.gov --sso

echo "=============================================================================================================="
echo "= Applying the bootstrap module to obtain credentials and read S3 Terraform state"
echo "=============================================================================================================="

terraform init
terraform apply "$@"
