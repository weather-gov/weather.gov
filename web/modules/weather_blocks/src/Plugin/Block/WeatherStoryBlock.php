<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\node\Entity\Node;
use Drupal\Core\Block\BlockBase;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\weather_data\Service\WeatherDataService;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a block of the weather story.
 *
 * @Block(
 *   id = "weathergov_weather_story",
 *   admin_label = @Translation("Weather story block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class WeatherStoryBlock extends BlockBase implements ContainerFactoryPluginInterface {
  /**
   * The current route.
   *
   * @var \Drupal\Core\Routing\RouteMatchInterface route
   */
  private $route;

  /**
   * Constructor for dependency injection.
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, RouteMatchInterface $route) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
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
    $routeName = $this->route->getRouteName();

    if ($routeName == "weather_routes.grid") {
      $wfo = $this->route->getParameter("wfo");

      $weatherStory = \Drupal::entityQuery("node")
        ->accessCheck(FALSE)
        ->condition('status', 1)
        ->condition('field_wfo', $wfo)
        ->execute();

      $weatherStory = Node::loadMultiple($weatherStory);
      $weatherStory = array_values($weatherStory);

      if(sizeof($weatherStory) > 0) {
        $weatherStory = $weatherStory[0];

        return [
          "title" => $weatherStory->getTitle(),
          "node" => $weatherStory
        ];
      }
    }
    return NULL;
  }

}
