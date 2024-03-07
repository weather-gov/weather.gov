<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Database\Connection;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\ServerException;

/**
 * Data layer methods
 */
class DataLayer
{
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
     * Constructor.
     */
    public function __construct(
        ClientInterface $httpClient,
        CacheBackendInterface $cache,
        Connection $database,
    ) {
        $this->client = $httpClient;
        $this->cache = $cache;
        $this->database = $database;

        // For a given request, assign it a response ID. We'll send this in the
        // headers to the API. If we've already gotten an ID for this response,
        // keep it.
        $this->responseId = uniqid();
    }

    /**
     * Get data from the weather API.
     *
     * The results for any given URL are cached for 60 seconds. Exceptions after
     * the maximum retries are cached for 1 second.
     */
    private function getFromWeatherAPI($url, $attempt = 1, $delay = 75)
    {
        if (!preg_match("/^https?:\/\//", $url)) {
            $baseUrl = getEnv("API_URL");
            $baseUrl = $baseUrl == false ? "https://api.weather.gov" : $baseUrl;
            $url = $baseUrl . $url;
        }

        $cacheHit = $this->cache->get($url);

        if (!$cacheHit) {
            try {
                $response = $this->client->get($url, [
                    // Add our response ID as a header to the API so we can
                    // track sequences of API calls for this one response.
                    "headers" => ["wx-gov-response-id" => $this->responseId],
                ]);
                $response = json_decode($response->getBody());
                $this->cache->set($url, $response, time() + 60);
                return $response;
            } catch (ServerException $e) {
                $logger = $this->getLogger("Weather.gov data service");
                $logger->notice("got 500 error on attempt $attempt for: $url");

                // Back off and try again.
                if ($attempt < 5) {
                    // Sleep is in microseconds, so scale it up to milliseconds.
                    usleep($delay * 1000);
                    return $this->getFromWeatherAPI(
                        $url,
                        $attempt + 1,
                        $delay * 1.65,
                    );
                }

                $logger->error("giving up on: $url");

                // Cache errors too. If we've already tried and failed on an
                // endpoint the maximum number of retries, don't try again on
                // subsequent calls to the same endpoint.
                $this->cache->set($url, (object) ["error" => $e], 1);
                throw $e;
            }
        } else {
            // If we cached an exception, throw it. Otherwise return the data.
            if (is_object($cacheHit->data) && isset($cacheHit->data->error)) {
                throw $cacheHit->data->error;
            }
            return $cacheHit->data;
        }
    }

    private $i_alertsState = false;
    public function getAlertsForState($state)
    {
        if (!$this->i_alertsState) {
            $this->i_alertsState = $this->getFromWeatherAPI(
                "/alerts/active?status=actual&area=$state",
            )->features;
        }
        return $this->i_alertsState;
    }

    private $i_dailyForecast = false;
    public function getDailyForecast($wfo, $x, $y)
    {
        $wfo = strtoupper($wfo);
        if (!$this->i_dailyForecast) {
            $this->i_dailyForecast = $this->getFromWeatherAPI(
                "/gridpoints/$wfo/$x,$y/forecast",
            )->properties;
        }
        return $this->i_dailyForecast;
    }

    private $i_grid = false;
    public function getGridpoint($wfo, $x, $y)
    {
        $wfo = strtoupper($wfo);
        if (!$this->i_grid) {
            $this->i_grid = $this->getFromWeatherAPI("/gridpoints/$wfo/$x,$y");
        }
        return $this->i_grid;
    }

    private $i_hourlyForecast = false;
    public function getHourlyForecast($wfo, $x, $y)
    {
        $wfo = strtoupper($wfo);
        if (!$this->i_hourlyForecast) {
            $this->i_hourlyForecast = $this->getFromWeatherAPI(
                "/gridpoints/$wfo/$x,$y/forecast/hourly",
            )->properties;
        }
        return $this->i_hourlyForecast;
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

    private $i_obsStations = false;
    public function getObservationStations($wfo, $x, $y)
    {
        $wfo = strtoupper($wfo);
        if (!$this->i_obsStations) {
            $this->i_obsStations = $this->getFromWeatherAPI(
                "/gridpoints/$wfo/$x,$y/stations",
            )->features;
        }
        return $this->i_obsStations;
    }

    private $i_point = false;
    public function getPoint($lat, $lon)
    {
        if (!$this->i_point) {
            $lat = round($lat, 4);
            $lon = round($lon, 4);

            $this->i_point = $this->getFromWeatherAPI("/points/$lat,$lon");
        }
        return $this->i_point;
    }

    private function getPlaceNear($wktGeometry)
    {
        $sql = "SELECT
          name,state,stateName,county,timezone,stateFIPS,countyFIPS
          FROM weathergov_geo_places
          ORDER BY ST_DISTANCE(point,ST_GEOMFROMTEXT('$wktGeometry'))
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

    private $i_placeNearPoint = [];
    public function getPlaceNearPoint($lat, $lon)
    {
        $key = "$lat $lon";
        if (!$this->i_placeNearPoint[$key]) {
            $this->i_placeNearPoint[$key] = $this->getPlaceNear(
                "POINT($lon $lat)",
            );
        }
        return $this->i_placeNearPoint[$key];
    }

    private $i_placeNearPolygon = [];
    public function getPlaceNearPolygon($points)
    {
        $wktPoints = array_map(function ($point) {
            return $point[0] . " " . $point[1];
        }, $points);
        $wktPoints = implode(",", $wktPoints);

        if (!$this->i_placeNearPolygon[$wktPoints]) {
            $this->iPlaceNearPolygon[$wktPoints] = $this->getPlaceNear(
                "POLYGON(($wktPoints))",
            );
        }
        return $this->iPlaceNearPolygon[$wktPoints];
    }

    public function databaseFetch($sql)
    {
        return $this->database->query($sql)->fetch();
    }
}
