<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\Logger\LoggerChannelTrait;
use Drupal\Core\Routing\RouteMatchInterface;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Promise\Promise;
use GuzzleHttp\Promise\Utils;

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
                $this->client->getAsync($url)->then(
                    function ($response) use ($url) {
                        $response = json_decode($response->getBody());
                        $this->cache->set($url, $response, time() + 60);
                        return $response;
                    },
                    function ($error) use ($url, $attempt, $delay) {
                        $logger = $this->getLogger("Weather.gov data service");
                        $logger->notice(
                            "got 500 error on attempt $attempt for: $url",
                        );

                        if ($attempt < 5) {
                            usleep($delay * 1000);
                            return $this->fetch(
                                $url,
                                $attempt + 1,
                                $delay * 1.65,
                            );
                        }

                        $logger->error("giving up on: $url");
                        $response = (object) ["error" => $error];
                        $this->cache->set($url, $response, time() + 5);
                        return $response;
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
        $response = $this->fetch($url)->wait();

        if (property_exists($response, "error")) {
            throw $response->error;
        }

        return $response;
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
        if (!array_key_exists($key, self::$i_products_by_type)) {
            $prop = "@graph";
            self::$i_products_by_type[$key] = $this->getFromWeatherAPI(
                "/products/types/$type",
            )->$prop;
        }
        return self::$i_products_by_type[$key];
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

    public function databaseFetch($sql, $args = [])
    {
        return $this->database->query($sql, $args)->fetch();
    }

    public function databaseFetchAll($sql, $args = [])
    {
        return $this->database->query($sql, $args)->fetchAll();
    }
}
