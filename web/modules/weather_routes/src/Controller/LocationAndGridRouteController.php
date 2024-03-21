<?php

declare(strict_types=1);

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Drupal\weather_data\Service\SpatialUtility;
use Drupal\weather_data\Service\WeatherDataService;
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
    private $dataLayer;

    /**
     * Constructor for dependency injection.
     */
    public function __construct($dataLayer)
    {
        $this->dataLayer = $dataLayer;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(ContainerInterface $container)
    {
        return new static($container->get("weather_data_layer"));
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
        try {
            $this->dataLayer->getPoint($lat, $lon);
            WeatherDataService::setPoint(
                SpatialUtility::pointArrayToObject([$lon, $lat]),
            );
            return [];
        } catch (\Throwable $e) {
            // If we don't get a corresponding grid location, throw a 404.
            throw new NotFoundHttpException();
        }
    }

    /**
     * Redirect the user from a grid to a lat/lon.
     *
     * This route resolves a WFO grid point to a lat/lon and redirects. If the
     * WFO grid is unknown, returns a 404 immediately.
     */
    public function redirectFromGrid($wfo, $gridX, $gridY)
    {
        try {
            $gridpoint = $this->dataLayer->getGridpoint($wfo, $gridX, $gridY);
            $point = $gridpoint->geometry->coordinates[0][0];

            $url = Url::fromRoute("weather_routes.point", [
                "lat" => round($point[1], 4),
                "lon" => round($point[0], 4),
            ]);
            return new RedirectResponse($url->toString());
        } catch (\Throwable $e) {
            throw new NotFoundHttpException();
        }
    }
}
