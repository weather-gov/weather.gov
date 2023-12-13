<?php

$settings['file_scan_ignore_directories'] = [
  'node_modules',
  'bower_components',
];
$settings['entity_update_batch_size'] = 50;
$settings['entity_update_backup'] = TRUE;

// Creating a Drupal 'private' file folder is required
// to expose 'private' s3fs bucket upload/download for
// images.
$settings['file_private_path'] = dirname(DRUPAL_ROOT) . '/private';

$settings['migrate_node_migrate_type_classic'] = FALSE;
$settings['config_sync_directory'] = dirname(DRUPAL_ROOT) . '/web/config';

$applicaiton_fqdn_regex = "^.+\.(app\.cloud\.gov|weather\.gov)$";
$settings['trusted_host_patterns'][] = $applicaiton_fqdn_regex;

$cf_application_data = json_decode(getenv('VCAP_APPLICATION') ?? '{}', TRUE);
$cf_service_data = json_decode(getenv('VCAP_SERVICES') ?? '{}', TRUE);
foreach ($cf_service_data as $service_list) {
  foreach ($service_list as $service) {
    if (stristr($service['name'], 'database')) {
      $databases['default']['default'] = [
        'database' => $service['credentials']['db_name'],
        'username' => $service['credentials']['username'],
        'password' => $service['credentials']['password'],
        'prefix' => '',
        'host' => $service['credentials']['host'],
        'port' => $service['credentials']['port'],
        'namespace' => 'Drupal\\mysql\\Driver\\Database\\mysql',
        'driver' => 'mysql',
        'autoload' => 'core/modules/mysql/src/Driver/Database/mysql/',
      ];
    }
    elseif (stristr($service['name'], 'secrets')) {
      $settings['hash_salt'] = hash('sha256', $service['credentials']['hash_salt']);
    }
    elseif (stristr($service['name'], 'storage')) {
      $config['s3fs.settings']['access_key'] = $service['credentials']['access_key_id'];
      $config['s3fs.settings']['bucket'] = $service['credentials']['bucket'];
      $config['s3fs.settings']['encryption'] = 'AES256';
      $config['s3fs.settings']['public_folder'] = 'public';
      $config['s3fs.settings']['private_folder'] = 'private';
      $config['s3fs.settings']['region'] = $service['credentials']['region'];
      $config['s3fs.settings']['secret_key'] = $service['credentials']['secret_access_key'];
      $config['s3fs.settings']['use_https'] = TRUE;

      // Updated config structure for s3fs 8.x-3.x
      $settings['s3fs.access_key'] = $service['credentials']['access_key_id'];
      $settings['s3fs.bucket'] = $service['credentials']['bucket'];
      $settings['s3fs.public_folder'] = 'public';
      $settings['s3fs.private_folder'] = 'private';
      $settings['s3fs.region'] = $service['credentials']['region'];
      $settings['s3fs.secret_key'] = $service['credentials']['secret_access_key'];
      $settings['s3fs.use_https'] = TRUE;
      $settings['s3fs.disable_cert_verify'] = FALSE;

      $settings['s3fs.use_s3_for_public'] = FALSE;
      $settings['s3fs.use_s3_for_private'] = TRUE;
      $settings['s3fs.upload_as_private'] = TRUE;
      // Twig templates _shouldn't_ be in the public dir (lest they be very slow)
      $settings['php_storage']['twig']['directory'] = '../storage/php';
    }
  }
}

$application_environment = $cf_application_data['space_name'];
switch ($application_environment) {
  case "greg":
    $config['samlauth.authentication']['sp_entity_id'] = 'https://weathergov-greg.app.cloud.gov';
    break;

  case "eric":
    $config['config_split.config_split.production']['status'] = TRUE;
    $config['samlauth.authentication']['sp_entity_id'] = 'https://weathergov-eric.app.cloud.gov';
    break;

  case "staging":
    $config['samlauth.authentication']['sp_entity_id'] = 'https://weathergov-staging.app.cloud.gov';
    break;

  case "prod":
    $config['samlauth.authentication']['sp_entity_id'] = 'https://beta.weather.gov';
    break;
}
