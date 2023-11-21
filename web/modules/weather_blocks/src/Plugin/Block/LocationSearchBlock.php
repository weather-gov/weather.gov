<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\weather_data\Service\WeatherDataService;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a block for searching for locations.
 *
 * @Block(
 *   id = "weathergov_location_search",
 *   admin_label = @Translation("Location search block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class LocationSearchBlock extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * A service for fetching weather data.
   *
   * @var \Drupal\weather_data\Service\WeatherDataService weatherData
   */
  private $weatherData;

  /**
   * The current route.
   *
   * @var \Drupal\Core\Routing\RouteMatchInterface route
   */
  private $route;

  /**
   * Constructor for dependency injection.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, WeatherDataService $weatherDataService, RouteMatchInterface $route) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->weatherData = $weatherDataService;
    $this->route = $route;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('weather_data'),
      $container->get('current_route_match')
    );
  }

  /**
   * Disable cacheing on this block.
   *
   * Because this is displayed to anonymous users and it is location-based (or
   * will be), we can't really rely on any cacheing here right now.
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
