<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;

/**
 * Provides a block for searching for locations.
 *
 * @Block(
 *   id = "weathergov_location_search",
 *   admin_label = @Translation("Location search block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class LocationSearchBlock extends BlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    return [
      '#theme' => "weather_blocks_location_search",
    ];
  }

}
