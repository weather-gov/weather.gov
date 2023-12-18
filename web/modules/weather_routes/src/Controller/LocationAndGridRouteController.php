<?php

declare(strict_types = 1);

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Returns responses for Weather routes routes.
 */
final class LocationAndGridRouteController extends ControllerBase {
  /**
   * A service for fetching weather data.
   *
   * @var WeatherDataService weatherData
   */
  private $weatherData;

  /**
   * Constructor for dependency injection.
   */
  public function __construct($weatherDataService) {
    $this->weatherData = $weatherDataService;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('weather_data')
    );
  }

  /**
   * No-operation.
   *
   * This is used to handle routes where we don't actually need to do anything.
   * Not setting a controller seems to cause Drupal to just stop processing the
   * page, so return an empty array and be done.
   */
  public function noop() {
    return [];
  }

  /**
   * Redirect the user from a point to a grid cell.
   *
   * This route resolves a lat/long into a WFO grid point and then redirects the
   * user to the correct grid route. If there's no grid point, throws a 404.
   */
  public function redirectToGrid($lat, $lon) {
    $grid = $this->weatherData->getGridFromLatLon($lat, $lon);

    if ($grid == NULL) {
      // If we don't get a corresponding grid location, throw a 404.
      throw new NotFoundHttpException();
    }

    if ($grid["wfo"] == NULL) {
      $logger = $this->getLogger("Weather.gov data service");
      $logger->notice("location has no grid: $lat / $lon");

      return new RedirectResponse("/not-implemented");
    }

    $url = Url::fromRoute("weather_routes.grid", $grid);
    return new RedirectResponse($url->toString());
  }

}
