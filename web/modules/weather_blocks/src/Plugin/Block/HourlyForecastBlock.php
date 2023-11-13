<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;
/**
 * Provides a block of the hourly (short term) weather conditions.
 *
 * @Block(
 *   id = "weathergov_hourly_forecast",
 *   admin_label = @Translation("Hourly forecast block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class HourlyForecastBlock extends BlockBase {

 /**
   * {@inheritdoc}
   */
  public function build() {
    return [
      '#theme' => "weather_blocks_hourly_forecast",
      '#data' => ['max_items' => '4'],  // @TODO:	Capture max_items value from block config. Hard code an integer for now.
    ];
  }

}
