<?php

declare(strict_types=1);

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Returns responses for Weather routes routes.
 */
final class LocationAndGridRouteController extends ControllerBase
{
    /**
     * A service for fetching weather data.
     *
     * @var WeatherDataService weatherData
     */
    private $weatherData;

    /**
     * Constructor for dependency injection.
     */
    public function __construct($weatherDataService)
    {
        $this->weatherData = $weatherDataService;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(ContainerInterface $container)
    {
        return new static($container->get("weather_data"));
    }

    /**
     * No-operation.
     *
     * This is used to handle routes where we don't actually need to do anything.
     * Not setting a controller seems to cause Drupal to just stop processing the
     * page, so return an empty array and be done.
     */
    public function noop()
    {
        return [];
    }

    public function serveLocationPage($lat, $lon)
    {
        $grid = $this->weatherData->getGridFromLatLon($lat, $lon);

        if ($grid == null) {
            // If we don't get a corresponding grid location, throw a 404.
            throw new NotFoundHttpException();
        }

        return [];
    }

    /**
     * Redirect the user from a grid to a lat/lon.
     *
     * This route resolves a WFO grid point to a lat/lon and redirects. If the
     * WFO grid is unknown, returns a 404 immediately.
     */
    public function redirectFromGrid($wfo, $gridX, $gridY)
    {
        $geometry = $this->weatherData->getGeometryFromGrid(
            $wfo,
            $gridX,
            $gridY,
        );
        $point = $geometry[0];

        $url = Url::fromRoute("weather_routes.point", [
            "lat" => round($point->lat, 4),
            "lon" => round($point->lon, 4),
        ]);
        return new RedirectResponse($url->toString());

        return new NotFoundHttpException();

        $grid = $this->weatherData->getGridFromLatLon($lat, $lon);

        if ($grid == null) {
            // If we don't get a corresponding grid location, throw a 404.
            throw new NotFoundHttpException();
        }

        if ($grid["wfo"] == null) {
            $logger = $this->getLogger("Weather.gov data service");
            $logger->notice("location has no grid: $lat / $lon");

            return new RedirectResponse("/not-implemented");
        }

        $url = Url::fromRoute("weather_routes.grid", $grid);
        return new RedirectResponse($url->toString());
    }
}
