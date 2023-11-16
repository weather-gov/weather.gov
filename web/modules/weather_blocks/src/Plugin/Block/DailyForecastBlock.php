<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;

/**
 * Provides a block of the daily forecast for the next 5 days
 * @Block(
 *   id = "weathergov_daily_forecast",
 *   admin_label = @Translation("Daily forecast block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class DailyForecastBlock extends BlockBase {
  /**
   * {@inheritdoc}
   */
  public function build(){
    return [
      '#theme' => "weather_blocks_daily_forecast"
    ];
  }
}
