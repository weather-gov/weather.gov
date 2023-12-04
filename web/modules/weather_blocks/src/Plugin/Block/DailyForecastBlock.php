<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the daily forecast for the next 5 days.
 *
 * @Block(
 *   id = "weathergov_daily_forecast",
 *   admin_label = @Translation("Daily forecast block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class DailyForecastBlock extends WeatherBlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    $location = $this->getLocation();

    if ($location->grid) {
      $grid = $location->grid;

      $data = $this->weatherData->getDailyForecastFromGrid(
        $grid->wfo,
        $grid->x,
        $grid->y
      );
      return ["days" => $data];
    }
    return NULL;
  }

}
