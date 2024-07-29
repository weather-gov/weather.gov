<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\weather_data\Service\AlertUtility;
use Drupal\weather_data\Service\DateTimeUtility;

/**
 * Provides a block of alert information
 *
 * @Block(
 *   id = "weathergov_info_alert",
 *   admin_label = @Translation("Alert info block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class AlertInfoBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build()
    {
        return ["alertTypes" => AlertUtility::getAlertTypes()];
    }
}
