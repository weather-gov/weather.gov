<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;

/**
 * Provides a 'Hello' Block.
 *
 * @Block(
 *   id = "weathergov_current_conditions",
 *   admin_label = @Translation("Current conditions block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class CurrentConditionsBlock extends BlockBase {

  public function getCacheMaxAge() {
    return 0;
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    date_default_timezone_set('America/New_York');

    return [
      '#theme' => "weather_blocks_current_conditions",
      '#data' => [
        'conditions' => [
          'long' => 'rain with high cloud cover',
          'short' => 'Rain showers'
        ],
        'feels_like' => 83,
        'humidity' => 55,
        'icon' => 'showers_scattered_rain.svg',
        'location' => 'Nashville, TN',
        'temperature' => 79,
        'timestamp' => [
          'formatted' => date("l g:i A T"),
          'utc' => time()
        ],
        'wind' => [
          'speed' => 10,
          'direction' => 'NE'
        ]
      ],
    ];
  }
}