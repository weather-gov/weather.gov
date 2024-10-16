<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\Logger\LoggerChannelTrait;
use Drupal\Core\Routing\RouteMatchInterface;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Promise\Promise;
use GuzzleHttp\Promise\Utils;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ServerException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Data layer methods
 */
class DataLayer
{
    use LoggerChannelTrait;

    /**
     * Cache of API calls for this request.
     *
     * @var cache
     */
    private $cache;

    /**
     * HTTP client.
     *
     * @var \GuzzleHttp\ClientInterface client
     */
    private $client;

    /**
     * Connection to the Drupal database.
     */
    private $database;

    /**
     * Identifier for a unique set of API requests.
     */
    private $responseId = false;

    private static $INITIALIZED = false;

    /**
     * Constructor.
     */
    public function __construct(
        ClientInterface $httpClient,
        CacheBackendInterface $cache,
        Connection $database,
        RouteMatchInterface $route,
        $preload = true,
    ) {
        $this->client = $httpClient;
        $this->cache = $cache;
        $this->database = $database;

        // For a given request, assign it a response ID. We'll send this in the
        // headers to the API. If we've already gotten an ID for this response,
        // keep it.
        $this->responseId = uniqid();

        // If we are on a location page route...
        if ($route->getRouteName() == "weather_routes.point" && $preload) {
            $lat = floatval($route->getParameter("lat"));
            $lon = floatval($route->getParameter("lon"));

            // And we have not already initialized...
            // Using a static variable here so it persists across constructions.
            // Two different data layer objects are constructed, and we don't
            // really want to fetch the data twice.
            if (!self::$INITIALIZED) {
                self::$INITIALIZED = true;

                // First thing we need to do is get the WFO information for this
                // lat/lon.
                $url = "/points/$lat,$lon";
                [$response, $statusCode, $isError] = $this->fetch($url)->wait();
                if ($isError) {
                    return;
                }

                $wfo = strtoupper($response->properties->gridId);
                $gridX = $response->properties->gridX;
                $gridY = $response->properties->gridY;
                $state =
                    $response->properties->relativeLocation->properties->state;

                // Then we can go get gridpoint info, forecasts, and list of
                // observation stations. These can happen concurrently.
                $urls = [
                    "alerts" => "/alerts/active?status=actual&area=$state",
                    "daily" => "/gridpoints/$wfo/$gridX,$gridY/forecast",
                    "gridpoint" => "/gridpoints/$wfo/$gridX,$gridY",
                    "hourly" => "/gridpoints/$wfo/$gridX,$gridY/forecast/hourly",
                    "stations" => "/gridpoints/$wfo/$gridX,$gridY/stations",
                ];

                // Fire off a async requests for any of the URLs that aren't
                // already in our cache.
                $responses = [];
                foreach ($urls as $key => $url) {
                    $responses[$key] = $this->fetch($url);
                }

                // Now wait for all of the responses to come back. This will
                // allow them to run concurrently. None of them actually go
                // until we wait for them, which is weird, but since what
                // we really want is concurrency anyway, that's fine.
                //
                // We also don't have to catch anything because our fetch()
                // method never rejects. Hooray?
                $responses = Utils::unwrap($responses);
                $responses = array_map(function ($responseData) {
                    // The first item in the array
                    // is the actual response std object
                    return $responseData[0];
                }, $responses);

                $station =
                    $responses["stations"]->features[0]->properties
                        ->stationIdentifier;
                $this->fetch("/stations/$station/observations?limit=1")->wait();
            }
        }
    }

    /**
     * Get a promise for the result of querying a URL.
     *
     * If the URL is already in cache, resolves that. Otherwise, makes an HTTP
     * request and resolves the result. In the event of a server error, will
     * retry up to 5 times before failing. The resolved data will contain an
     * error property if the endpoint was ultimately unsucessful.
     *
     * The results for any given URL are cached for 60 seconds. Exceptions after
     * the maximum retries are cached for 5 seconds.
     */
    private function fetch($url, $attempt = 1, $delay = 75)
    {
        if (!preg_match("/^https?:\/\//", $url)) {
            $baseUrl = getEnv("API_URL");
            $baseUrl = $baseUrl == false ? "https://api.weather.gov" : $baseUrl;
            $url = $baseUrl . $url;
        }

        $promise = new Promise();

        $cacheHit = $this->cache->get($url);

        if ($cacheHit) {
            $promise->resolve($cacheHit->data);
        } else {
            $promise->resolve(
                $this->client
                    ->getAsync($url, [
                        "headers" => [
                            "wx-gov-response-id" => $this->responseId,
                        ],
                    ])
                    ->then(
                        function ($response) use ($url) {
                            $statusCode = $response->getStatusCode();
                            $result = [
                                json_decode($response->getBody()),
                                $statusCode,
                                false, //Whether or not there is an error
                            ];
                            $this->cache->set($url, $result, time() + 60);
                            return $result;
                        },
                        function ($error) use ($url, $attempt, $delay) {
                            $response = $error->getResponse();
                            $statusCode = $response->getStatusCode();
                            $result = [
                                "error" => $error,
                            ];

                            $logger = $this->getLogger(
                                "Weather.gov data service",
                            );
                            $logger->notice(
                                "got $statusCode error on attempt $attempt for: $url",
                            );
                            $logger->notice($error);

                            if (
                                is_a(
                                    $error,
                                    "GuzzleHttp\Exception\ClientException",
                                )
                            ) {
                                // In this case, the 'error' is a 4xx
                                // level response. We should skip
                                // repeated retries and return the response
                                // verbatim
                                $this->cache->set($url, $result, time() + 60);
                            } else {
                                if ($attempt < 5) {
                                    usleep($delay * 1000);
                                    return $this->fetch(
                                        $url,
                                        $attempt + 1,
                                        $delay * 1.65,
                                    );
                                }

                                $logger->error("giving up on: $url");
                                $this->cache->set($url, $result, time() + 5);
                            }

                            return [$error, $statusCode, true];
                        },
                    ),
            );
        }

        return $promise;
    }

    /**
     * Synchronous wrapper around async fetch.
     */
    private function getFromWeatherAPI($url, $attempt = 1, $delay = 75)
    {
        [$responseOrError, $statusCode, $isError] = $this->fetch($url)->wait();

        if ($isError && $statusCode < 500) {
            throw new NotFoundHttpException();
        } elseif ($isError) {
            throw $responseOrError;
        }

        return $responseOrError;
    }

    private static $i_alertsState = false;
    public function getAlertsForState($state)
    {
        if (!self::$i_alertsState) {
            $state = strtoupper($state);
            self::$i_alertsState = $this->getFromWeatherAPI(
                "/alerts/active?status=actual&area=$state",
            )->features;
        }
        return self::$i_alertsState;
    }

    private static $i_dailyForecast = false;
    public function getDailyForecast($wfo, $x, $y)
    {
        $wfo = strtoupper($wfo);
        if (!self::$i_dailyForecast) {
            self::$i_dailyForecast = $this->getFromWeatherAPI(
                "/gridpoints/$wfo/$x,$y/forecast",
            )->properties;
        }
        return self::$i_dailyForecast;
    }

    private static $i_grid = false;
    public function getGridpoint($wfo, $x, $y)
    {
        $wfo = strtoupper($wfo);
        if (!self::$i_grid) {
            self::$i_grid = $this->getFromWeatherAPI("/gridpoints/$wfo/$x,$y");
        }
        return self::$i_grid;
    }

    private static $i_hourlyForecast = false;
    public function getHourlyForecast($wfo, $x, $y)
    {
        $wfo = strtoupper($wfo);
        if (!self::$i_hourlyForecast) {
            self::$i_hourlyForecast = $this->getFromWeatherAPI(
                "/gridpoints/$wfo/$x,$y/forecast/hourly",
            )->properties;
        }
        return self::$i_hourlyForecast;
    }

    public function getCurrentObservation($station)
    {
        // Don't stash this one away in an instance variable because it may need
        // to be called with multiple stations in order to find a valid result.
        // This is currently only called by getCurrentConditionsFromGrid, so it
        // shouldn't duplicate any calls.
        return $this->getFromWeatherAPI(
            "/stations/$station/observations?limit=1",
        )->features[0]->properties;
    }

    private static $i_obsStations = false;
    public function getObservationStations($wfo, $x, $y)
    {
        $wfo = strtoupper($wfo);
        if (!self::$i_obsStations) {
            self::$i_obsStations = $this->getFromWeatherAPI(
                "/gridpoints/$wfo/$x,$y/stations",
            )->features;
        }
        return self::$i_obsStations;
    }

    private static $i_products_by_type_and_office = [];
    public function getProductsByTypeAndOffice($type, $wfo)
    {
        $wfo = strtoupper($wfo);
        $key = "$type / $wfo";

        if (!array_key_exists($key, self::$i_products_by_type_and_office)) {
            $prop = "@graph";
            self::$i_products_by_type_and_office[
                $key
            ] = $this->getFromWeatherAPI(
                "/products/types/$type/locations/$wfo",
            )->$prop;
        }
        return self::$i_products_by_type_and_office[$key];
    }

    private static $i_products_by_type = [];
    public function getProductsByType($type)
    {
        if (!array_key_exists($type, self::$i_products_by_type)) {
            $prop = "@graph";
            self::$i_products_by_type[$type] = $this->getFromWeatherAPI(
                "/products/types/$type",
            )->$prop;
        }
        return self::$i_products_by_type[$type];
    }

    private static $i_products = [];
    public function getProduct($uuid)
    {
        if (!array_key_exists($uuid, self::$i_products)) {
            $product = $this->getFromWeatherAPI("/products/$uuid");

            self::$i_products[$uuid] = $product;
        }
        return self::$i_products[$uuid];
    }

    private static $i_point = false;
    public function getPoint($lat, $lon)
    {
        if (!self::$i_point) {
            $lat = round($lat, 4);
            $lon = round($lon, 4);

            self::$i_point = $this->getFromWeatherAPI("/points/$lat,$lon");
        }
        return self::$i_point;
    }

    private function getPlaceNear($wktGeometry)
    {
        $sql = "SELECT
          name,state,stateName,county,timezone,stateFIPS,countyFIPS
          FROM weathergov_geo_places
          ORDER BY ST_DISTANCE(point,$wktGeometry)
          LIMIT 1";

        $place = $this->database->query($sql)->fetch();

        $place = (object) [
            "city" => $place->name,
            "state" => $place->state,
            "stateName" => $place->stateName,
            "stateFIPS" => $place->stateFIPS,
            "county" => $place->county,
            "countyFIPS" => $place->countyFIPS,
            "timezone" => $place->timezone,
        ];

        return $place;
    }

    private static $i_placeNearPoint = [];
    public function getPlaceNearPoint($lat, $lon)
    {
        $key = "$lat $lon";
        if (!array_key_exists($key, self::$i_placeNearPoint)) {
            self::$i_placeNearPoint[$key] = $this->getPlaceNear(
                SpatialUtility::pointArrayToWKT([$lon, $lat]),
            );
        }
        return self::$i_placeNearPoint[$key];
    }

    private static $i_placeNearPolygon = [];
    public function getPlaceNearPolygon($points)
    {
        $wktPoints = SpatialUtility::geometryObjectToWKT($points);

        if (!array_key_exists($wktPoints, self::$i_placeNearPolygon)) {
            self::$i_placeNearPolygon[$wktPoints] = $this->getPlaceNear(
                $wktPoints,
            );
        }
        return self::$i_placeNearPolygon[$wktPoints];
    }

    public function getSatelliteMetadata($wfo)
    {
        $wfo = strtolower($wfo);
        $url =
            "https://cdn.star.nesdis.noaa.gov/WFO/catalogs/WFO_02_" .
            $wfo .
            "_catalog.json";
        [$response, ,] = $this->fetch($url)->wait();
        return $response;
    }

    public function databaseFetch($sql, $args = [])
    {
        return $this->database->query($sql, $args)->fetch();
    }

    public function databaseFetchAll($sql, $args = [])
    {
        return $this->database->query($sql, $args)->fetchAll();
    }
}
