#!/usr/bin/env bash
#
# converts ministack aws settings to an .env that we can use for local dev purposes

set -euo pipefail

die() {
  echo "error: $*" >&2
  exit 1
}

if [ "$#" -ne 1 ];
then
    die "$0 requires the ECS service as a parameter. valid options: django, interop, alerts, ghwo, gridcache, wpcprob"
fi

SERVICE=$1

call_with_local_aws() {
    env -u AWS_PROFILE \
    AWS_ENDPOINT_URL=http://localhost:4566 \
    AWS_ACCESS_KEY_ID=mock_key \
    AWS_SECRET_ACCESS_KEY=mock_secret \
    AWS_DEFAULT_REGION=us-east-1 "$@"
}

# grab the ECS service definition which contains env vars and secrets.
ECS_DEFINITION=$(call_with_local_aws \
    aws ecs describe-task-definition \
    --task-definition "weathergov-dev-$SERVICE" \
    --query 'taskDefinition.containerDefinitions[0]' \
    --output json)

# convert name/value pairs to env settings and output
jq -r '.environment[]? | "\(.name)=\(.value)"' <<< "$ECS_DEFINITION"

# for secrets, we grab the name/values too but we need to iterate over each
# `valueFrom` and get the actual secret value.
ECS_SECRETS=$(jq -r '.secrets[]? | "\(.name)=\(.valueFrom)"' <<< "$ECS_DEFINITION")

for secret in $ECS_SECRETS; do
    # split 'em out in name/valueFrom pairs
    SECRET_NAME=$(echo "$secret" | cut -d '=' -f 1)
    RAW_SECRET=$(echo "$secret" | cut -d '=' -f 2)
    # we want to elide ':username::' or ':password::' if extant
    SECRET_ID=$(echo "$RAW_SECRET" | cut -d ':' -f 1-7)
    ACTUAL_SECRET=$(call_with_local_aws \
        aws secretsmanager get-secret-value \
        --secret-id "$SECRET_ID" \
        --query SecretString \
        --output text)
    # depending on the secrets format, we might have JSON or a plaintext secret.
    # this is annoying. i don't know how to do this cleanly.
    JSON_KEY=$(echo "$RAW_SECRET" | cut -d ':' -f 8)
    if [ -n "$JSON_KEY" ]; then
        printf '%s=%s\n' "$SECRET_NAME" "$(jq -r --arg key "$JSON_KEY" '.[$key]' <<< "$ACTUAL_SECRET")"
    else
        printf '%s=%s\n' "$SECRET_NAME" "$ACTUAL_SECRET"
    fi
done
