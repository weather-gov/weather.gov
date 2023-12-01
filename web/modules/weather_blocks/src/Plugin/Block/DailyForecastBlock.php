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
    $routeName = $this->route->getRouteName();

    if ($routeName == "weather_routes.grid") {
      $data = $this->weatherData->getDailyForecast($this->route);
      return ["days" => $data];
    }
    return NULL;
  }

}
