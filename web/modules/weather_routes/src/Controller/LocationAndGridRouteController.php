<?php

declare(strict_types=1);

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Drupal\weather_data\Service\SpatialUtility;
use Drupal\weather_data\Service\WeatherDataService;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Returns responses for Weather routes routes.
 */
final class LocationAndGridRouteController extends ControllerBase
{
    /**
     * A service for fetching weather data.
     *
     * @var DataLayer weatherData
     */
    private $dataLayer;

    private $request;

    /**
     * Constructor for dependency injection.
     */
    public function __construct($dataLayer, $request)
    {
        $this->dataLayer = $dataLayer;
        $this->request = $request;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(ContainerInterface $container)
    {
        return new static(
            $container->get("weather_data_layer"),
            $container->get("request_stack"),
        );
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
        $path = $this->request->getCurrentRequest()->getPathInfo();

        // Drupal routes are not case-sensitive. However, it uses the path to
        // determine what Twig files to load, and it *DOES* maintain casing for
        // that. So where we might land here for a URL that looks like
        // /POINT/{lat}/{lon} correctly, Drupal will then try to load a template
        // at page--POINT.html.twig instead of page--point.html.twig.
        //
        // To guard against his, if we see that we're not on a lowercase path,
        // redirect to the lowercase one. It's a bit clunky, but it shouldn't
        // be a particularly common use case. We can consider looking at other
        // options if analytics shows us people are landing here frequently.
        if ($path !== strtolower($path)) {
            return new RedirectResponse(strtolower($path));
        }

        try {
            // Need to figure out what to do here – we should deffo not simply
            // continue if the lat/lon given to us is not covered by NWS, but
            // that knowledge has now been pushed over to the interop layer.
            // Maybe a simple "is valid" query here, which is effectively what
            // we were doing previously anyway. And let the interop layer handle
            // caching on its own.
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

    private function getKnownPlace($state, $place)
    {
        // We escape spaces with underscores and slashes with commas. We need
        // to unescape them before querying. (None of the place names in our
        // database have underscores or commas at the time of this writing.)
        $place = str_replace("_", " ", $place);
        $place = str_replace(",", "/", $place);

        return $this->dataLayer->databaseFetch(
            "SELECT
                ST_X(point) AS lon,
                ST_Y(point) AS lat,
                state,
                name
            FROM weathergov_geo_places
            WHERE
                state LIKE :state
                AND
                name LIKE :place",
            [":state" => $state, ":place" => $place],
        );
    }

    public function servePlacePage($state, $place)
    {
        try {
            $known = $this->getKnownPlace($state, $place);

            // If we don't know this place, immediately return a 404. There's no
            // point doing any further processing.
            if ($known == false) {
                throw new NotFoundHttpException();
            }

            // If the place name has a space in it, we'll need to redirect the
            // user to the canonical URL.
            $redirectForSpaces = str_contains($place, " ");

            // Unescape the place name so we can compare it to the place name
            // we got from the database.
            $place = str_replace("_", " ", $place);
            $place = str_replace(",", "/", $place);

            // If the place name we got has a space in it, or if the state or
            // place do not strictly match what's in our database, we'll send
            // the user a redirect to our canonical place URL.
            if (
                $redirectForSpaces ||
                $state != $known->state ||
                $place != $known->name
            ) {
                // We'll send them back to this same route, but we'll use
                // the state and place names from our database, with the
                // place name escaped to handle spaces and slashes.
                // (There are two places in American Samoa with slashes in
                // their names, but slashes are URL path characters so we
                // don't want to persist them!)
                $url = Url::fromRoute("weather_routes.place", [
                    "state" => $known->state,
                    "place" => str_replace(
                        "/",
                        ",",
                        str_replace(" ", "_", $known->name),
                    ),
                ]);
                return new RedirectResponse($url->toString());
            }

            // If we're here, we know the location and the requested URL is
            // already canonical, so continue with the rendering process.
            // If anyone figures out how to pass the lat/lon from here on
            // through the process, that'd be dandy – then the template
            // variable preprocessor thingy wouldn't have to redo this query
            return [];
        } catch (\Throwable $e) {
            throw new NotFoundHttpException();
        }

        throw new NotFoundHttpException();
    }
}
