#!/usr/bin/env bash

set -e

if [[ $# -lt 2 ]]; then
  echo "usage: $0 SANDBOX_NAME TERRAFORM_CMD [TERRAFORM_ARGS]"
  echo "You must pass the sandbox_name as the first argument and terraform command as the second"
  echo "All other arguments are passed as-is to terraform"
  exit 1
fi

sandbox_name="$1"
cmd="$2"
shift 2

terraform init -backend-config="path=$sandbox_name/terraform.tfstate" -reconfigure
terraform "$cmd" -var sandbox_name="$sandbox_name" "$@"
