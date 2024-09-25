#!/bin/bash

if [ -z "${VCAP_SERVICES:-}" ]; then
    echo "VCAP_SERVICES must a be set in the environment: aborting bootstrap";
    exit 1;
fi

export home="/home/vcap"
dirs=( "${home}/private" "${home}/web/sites/default/files" )

for dir in "${dirs[@]}"; do
  if [ ! -d "${dir}" ]; then
    echo "Creating ${dir} directory ... "
    mkdir "${dir}"
    chown vcap. "${dir}"
  fi
done

# Create files for SAML auth
export home="/home/vcap"
export app_path="${home}/app"
echo "${VCAP_SERVICES}" | jq -r '."user-provided"[].credentials.SP_PUBLIC_KEY' | base64 -d > ${app_path}/sp_public_key.pem
echo "${VCAP_SERVICES}" | jq -r '."user-provided"[].credentials.SP_PRIVATE_KEY' | base64 -d > ${app_path}/sp_private_key.pem
echo "${VCAP_SERVICES}" | jq -r '."user-provided"[].credentials.IDP_PUBLIC_KEY' | base64 -d > ${app_path}/idp_public_key.crt

chmod 600 ${app_path}/sp_public_key.pem
chmod 600 ${app_path}/sp_private_key.pem
chmod 600 ${app_path}/idp_public_key.crt
