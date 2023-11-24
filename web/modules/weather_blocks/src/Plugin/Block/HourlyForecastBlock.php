<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the hourly (short term) weather conditions.
 *
 * @Block(
 *   id = "weathergov_hourly_forecast",
 *   admin_label = @Translation("Hourly forecast block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class HourlyForecastBlock extends WeatherBlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    $routeName = $this->route->getRouteName();

    if ($routeName == "weather_routes.grid") {
      $max = 12;
      $data = $this->weatherData->getHourlyForecast($this->route);
      $data = array_slice($data, 0, $max);

      return [
        '#theme' => "weather_blocks_hourly_forecast",
        '#data' => $data,
      ];
    }
    return NULL;
  }

}
