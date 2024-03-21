<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\node\NodeInterface;
use Drupal\weather_data\Service\SpatialUtility;
use Drupal\weather_data\Service\WeatherDataService;
use Drupal\weather_data\Service\WeatherEntityService;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Base class for weather.gov custom blocks.
 *
 * This class handles the dependency injection to get access to a
 * RouteMatchInterface object and a WeatherDataService object.
 */
abstract class WeatherBlockBase extends BlockBase implements
    ContainerFactoryPluginInterface
{
    /**
     * A service for fetching weather data.
     *
     * @var \Drupal\weather_data\Service\WeatherDataService weatherData
     */
    protected $weatherData;

    /**
     * An entity type manager.
     *
     * @var \Drupal\Core\Entity\EntityTypeManagerInterface entityTypeManager
     */
    protected $entityTypeService;

    /**
     * The current route.
     *
     * @var \Drupal\Core\Routing\RouteMatchInterface route
     */
    protected $route;

    /**
     * Constructor for dependency injection.
     */
    public function __construct(
        array $configuration,
        $plugin_id,
        $plugin_definition,
        RouteMatchInterface $route,
        WeatherDataService $weatherDataService,
        WeatherEntityService $entityTypeService,
    ) {
        parent::__construct($configuration, $plugin_id, $plugin_definition);
        $this->weatherData = $weatherDataService;
        $this->entityTypeService = $entityTypeService;
        $this->route = $route;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(
        ContainerInterface $container,
        array $configuration,
        $plugin_id,
        $plugin_definition,
    ) {
        return new static(
            $configuration,
            $plugin_id,
            $plugin_definition,
            $container->get("current_route_match"),
            $container->get("weather_data"),
            $container->get("weather_entity"),
        );
    }

    /**
     * {@inheritdoc}
     */
    public function blockForm($form, FormStateInterface $form_state)
    {
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
    public function blockSubmit($form, FormStateInterface $form_state)
    {
        parent::blockSubmit($form, $form_state);

        $grid = $form_state->getValue("grid");
        if ($grid) {
            $grid = $grid["wfo"] . "," . $grid["gridX"] . "," . $grid["gridY"];

            $this->setConfigurationValue("grid", $grid);
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
    public function getCacheMaxAge()
    {
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
    public function getLocation()
    {
        $location = (object) [
            "grid" => false,
            "point" => false,
        ];

        // If we're on a location route, pull location from the URL.
        if ($this->route->getRouteName() == "weather_routes.point") {
            $lat = floatval($this->route->getParameter("lat"));
            $lon = floatval($this->route->getParameter("lon"));

            $location->point = SpatialUtility::pointArrayToObject([$lon, $lat]);

            $location->grid = $this->weatherData->getGridFromLatLon($lat, $lon);
        } else {
            // Otherwise, attempt to get it from configuration.
            $configuredGrid = $this->getConfiguration()["grid"] ?? false;
            if ($configuredGrid != false && $configuredGrid != ",,") {
                $parts = explode(",", $configuredGrid);

                $wfo = strtoupper($parts[0]);
                $x = $parts[1];
                $y = $parts[2];

                $location->grid = (object) [
                    "wfo" => $wfo,
                    "x" => $x,
                    "y" => $y,
                ];

                $geometry = $this->weatherData->getGeometryFromGrid(
                    $wfo,
                    $x,
                    $y,
                );

                $location->point = $geometry[0];
            }
        }

        return $location;
    }
}
