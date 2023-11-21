<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block for searching for locations.
 *
 * @Block(
 *   id = "weathergov_location_search",
 *   admin_label = @Translation("Location search block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class LocationSearchBlock extends WeatherBlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    $location = NULL;
    $data = $this->weatherData->getCurrentConditions($this->route);

    if($data) {
      $location = $data["location"];
    }

    return [
      '#theme' => "weather_blocks_location_search",
      'location' => $location
    ];
  }

}
