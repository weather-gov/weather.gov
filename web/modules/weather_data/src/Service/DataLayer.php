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

    public function databaseFetch($sql, $args = [])
    {
        return $this->database->query($sql, $args)->fetch();
    }

    public function databaseFetchAll($sql, $args = [])
    {
        return $this->database->query($sql, $args)->fetchAll();
    }
}
