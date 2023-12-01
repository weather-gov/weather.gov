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
    $location = $this->getLocation();

    if ($location->grid) {
      $grid = $location->grid;
      return [
        '#theme' => "weather_blocks_current_conditions",
        '#data' => $this->weatherData->getCurrentConditionsFromGrid(
          $grid->wfo,
          $grid->x,
          $grid->y),
      ];
    }
    return NULL;
  }

}
