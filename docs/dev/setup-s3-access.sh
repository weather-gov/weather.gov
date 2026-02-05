#!/usr/bin/env bash
#
# setup access to a s3 bucket. adapted from
# https://docs.cloud.gov/platform/services/s3/#interacting-with-your-s3-bucket-from-outside-cloudgov

# Run this script with a . in order to set environment variables in your shell
# (NB: only bash-like shells are supported)
# For example:
# . ./setup-s3-access.sh weathergov-logs-test

set -x

SERVICE_INSTANCE_NAME=${1:-"weathergov-logs-test"}
KEY_NAME=s3-access-key

cf create-service-key "${SERVICE_INSTANCE_NAME}" "${KEY_NAME}"
S3_CREDENTIALS=$(cf service-key "${SERVICE_INSTANCE_NAME}" "${KEY_NAME}" | tail -n +2)

export AWS_ACCESS_KEY_ID=$(echo "${S3_CREDENTIALS}" | jq -r '.access_key_id')
export AWS_SECRET_ACCESS_KEY=$(echo "${S3_CREDENTIALS}" | jq -r '.secret_access_key')
export BUCKET_NAME=$(echo "${S3_CREDENTIALS}" | jq -r '.bucket')
export AWS_DEFAULT_REGION=$(echo "${S3_CREDENTIALS}" | jq -r '.region')

# test that the bucket listing succeeded
aws s3 ls s3://${BUCKET_NAME}

set +x
