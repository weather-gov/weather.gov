# Extending Drupal

We have a collection of third-party modules that extend the functionality of Drupal. See [our documentation on selecting third-party "contributed" modules](contributed-modules.md).

## Adding a new module to all environments

Adding a new module requires installing it with composer and then enabling it and configuring the settings: 

1. run `composer require 'drupal/package:^version'`
2. run `docker compose exec drupal drush en package` to enable, then `make config:export` to pull down the new enabled settings. You can also enable the module in the admin interface. 

## Adding a new module to a singular environment

We use [config split](https://www.drupal.org/project/config_split) so that we can have different settings in different environments. Splits come in full and partial splits so that you can have a module across environments with different settings. Adding a module in only one environment requires some extra steps when installing:

1. run `composer require 'drupal/package:^version'` like you normally would
2. run `docker compose exec drupal drush en package` to enable, then `make config:export` to pull down the new enabled settings
3. now, remove the extension from `core.extension.yml` in config/sync. add the extension to `config/sync/config_split.config_split.SPLIT.yml` _and_ add any settings files. Move the settings files that were added to sync to the split instead. 
4. run `make config:import` and see that config split is removing the settings. 
5. go to the environment where you are trying to enable the module and ensure that it is present and enabled. 
