# Clear and rebuild Drupal caches
clear-cache:
  docker compose exec drupal drush cache:rebuild
alias cc := clear-cache

# Export current Drupal configuration to the config directory
export-config:
  docker compose exec drupal drush config:export -y

## Export all content to web/scs-export
export-content:
  rm web/scs-export/*.zip
  docker compose exec drupal drush content:export node scs-export --all-content

# Export current Drupal configuration to the config directory
import-config:
  docker compose exec drupal drush config:import -y
  docker compose exec drupal drush twig:debug on
  docker compose exec drupal drush state:set disable_rendered_output_cache_bins 1

# Import content from web/scs-export
import-content:
  #!/usr/bin/env sh
  for file in web/scs-export/*; do
    file="scs-export/$(basename $file)"
    docker compose exec drupal drush content:import "$file";
  done

# Restore the dev settings file from the example
update-settings:
  cp -f web/sites/example.settings.dev.php web/sites/settings.dev.php
