<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a block of the current weather conditions.
 *
 * @Block(
 *   id = "weathergov_current_conditions",
 *   admin_label = @Translation("Current conditions block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class CurrentConditionsBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * A service for fetching weather data.
   *
   * @var WeatherDataService weatherData
   */
  private $weatherData;

  /**
   * Constructor for dependency injection.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, $weatherDataService) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->weatherData = $weatherDataService;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('weather_data')
    );
  }

  /**
   * Disable cacheing on this block.
   *
   * Because this is displayed to anonymous
   * users and it is location-based (or will be), we can't really rely on any
   * cacheing here right now.
   *
   * Once we hook up location data, it may be the case that Drupal can cache
   * responses based on that location, in which case a short cache could work
   * fine. Not 100% convinced we should do it, though, because we'd just be
   * trading one kind of complexity for another (time vs. space).
   */
  public function getCacheMaxAge() {
    return 0;
  }

  /**
   * {@inheritdoc}
   */
  public function build() {
    return [
      '#theme' => "weather_blocks_current_conditions",
      '#data' => $this->weatherData->getCurrentConditions(),
    ];
  }

}
