#! /bin/bash

echo "Checking if installed..."

SECRETS=$(echo "$VCAP_SERVICES" | jq -r '.["user-provided"][] | select(.name == "secrets") | .credentials')

install_drupal() {
  ROOT_USER_NAME=$(echo "$SECRETS" | jq -r '.ROOT_USER_NAME')
  ROOT_USER_PASS=$(echo "$SECRETS" | jq -r '.ROOT_USER_PASS')

  : "${ROOT_USER_NAME:?Need and root user name for Drupal}"
  : "${ROOT_USER_PASS:?Need and root user pass for Drupal}"

  drush site:install minimal \
      --no-interaction \
      --account-name="$ROOT_USER_NAME" \
      --account-pass="$ROOT_USER_PASS" \
      --existing-config
}
drush list | grep "config:import" > /dev/null || install_drupal

echo  "Updating drupal ... "
drush state:set system.maintenance_mode 1 -y
drush deploy -y
# TODO: Remove and only pull content down
# Temporarily importing content that was created locally
for file in web/scs-export/*; do
    file=${file#*/};
    drush content:import $file;
done
drush state:set system.maintenance_mode 0 -y
echo "Bootstrap finished"
