<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the current weather conditions.
 *
 * @Block(
 *   id = "weathergov_current_conditions",
 *   admin_label = @Translation("Current conditions block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class CurrentConditionsBlock extends WeatherBlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    $routeName = $this->route->getRouteName();

    if ($routeName == "weather_routes.grid") {
      return [
        '#theme' => "weather_blocks_current_conditions",
        '#data' => $this->weatherData->getCurrentConditions($this->route),
      ];
    }
    return NULL;
  }

}
