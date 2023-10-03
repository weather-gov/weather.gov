export home="/home/vcap"

## Updated ~/.bashrc to update $PATH when someone logs in.
[ -z $(cat ${home}/.bashrc | grep PATH) ] && \
  touch ${home}/.bashrc && \
  echo "alias nano=\"${home}/deps/0/apt/bin/nano\"" >> ${home}/.bashrc && \
  echo "PATH=$PATH:/home/vcap/app/php/bin:/home/vcap/app/vendor/drush/drush" >> /home/vcap/.bashrc

source ${home}/.bashrc

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

if [ "${CF_INSTANCE_INDEX:-''}" == "0" ] && [ "${APP_NAME}" == "weather" ]; then
  # If there is no "config:import" command, Drupal needs to be installed
  drush list | grep "config:import" > /dev/null || install_drupal
  
  # Clear the cache
  drush cache:rebuild --no-interaction
fi
