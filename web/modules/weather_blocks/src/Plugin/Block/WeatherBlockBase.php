<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\weather_data\Service\WeatherDataService;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Base class for weather.gov custom blocks.
 *
 * This class handles the dependency injection to get access to a
 * RouteMatchInterface object and a WeatherDataService object.
 */
abstract class WeatherBlockBase extends BlockBase implements ContainerFactoryPluginInterface {

  /**
   * A service for fetching weather data.
   *
   * @var \Drupal\weather_data\Service\WeatherDataService weatherData
   */
  protected $weatherData;

  /**
   * The current route.
   *
   * @var \Drupal\Core\Routing\RouteMatchInterface route
   */
  protected $route;

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
   * {@inheritdoc}
   */
  public function blockForm($form, FormStateInterface $form_state) {
    $form = parent::blockForm($form, $form_state);
    $config = $this->getConfiguration();
    $grid = $config["grid"] ?? ",,";

    $grid = explode(",", $grid);

    $form["grid"] = [
      "#type" => "fieldset",
      "#title" => "Manual location - for testing",
      "wfo" => [
        "#type" => "textfield",
        "#title" => "WFO",
        "#default_value" => $grid[0],
      ],
      "gridX" => [
        "#type" => "textfield",
        "#title" => "Grid X coordinate",
        "#default_value" => $grid[1],
      ],
      "gridY" => [
        "#type" => "textfield",
        "#title" => "Grid Y coordinate",
        "#default_value" => $grid[2],
      ],
    ];
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function blockSubmit($form, FormStateInterface $form_state) {
    parent::blockSubmit($form, $form_state);

    $grid = $form_state->getValue("grid");
    if ($grid) {
      $grid = $grid["wfo"] . "," . $grid["gridX"] . "," . $grid["gridY"];

      $this->setConfigurationValue(
        "grid",
        $grid
      );
    }
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
   * Get the current location that the block should be associated with.
   *
   * If the current route is on the grid, pulls the WFO grid information from
   * the URL.
   *
   * @returns array $location An array with location info in the following
   * structure:
   *     array['grid'] An NWS API grid response
   *                        ['wfo'] The NWS WFO code for the location
   *                       ['gridX'] The X value of the grid coordinate
   *                       ['gridY'] The Y value of the grid coordinate
   */
  public function getLocation() {
    $location = (object) [
      "grid" => FALSE,
    ];

    // If we're on a grid route, pull location from the URL.
    if ($this->route->getRouteName() === "weather_routes.grid") {

      $wfo = $this->route->getParameter("wfo");
      $x = $this->route->getParameter("gridX");
      $y = $this->route->getParameter("gridY");

      $location->grid = (object) [
        "wfo" => strtoupper($wfo),
        "x" => $x,
        "y" => $y,
      ];
    }
    // Otherwise, attempt to get it from configuration.
    else {
      $configuredGrid = $this->getConfiguration()["grid"] ?? FALSE;
      if ($configuredGrid) {
        $parts = explode(",", $configuredGrid);

        $location->grid = (object) [
          "wfo" => strtoupper($parts[0]),
          "x" => $parts[1],
          "y" => $parts[2],
        ];
      }
    }

    return $location;
  }

}
