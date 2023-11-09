
#! /bin/bash

echo  "Updating drupal ... "
drush state:set system.maintenance_mode 1 -y
drush deploy
# TODO: Remove and only pull content down
# Temporarily importing content that was created locally
for file in web/scs-export/*; do
    file=${file#*/};
    drush content:import $file;
done
drush state:set system.maintenance_mode 0 -y
echo "Bootstrap finished"
