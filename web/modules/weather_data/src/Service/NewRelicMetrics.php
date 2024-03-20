<?php

namespace Drupal\weather_data\Service;

use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\ServerException;
use GuzzleHttp\Psr7\Request;
use Drupal\Core\Site\Settings;
use Drupal\Core\Logger\LoggerChannelTrait;

class NewRelicMetrics
{
    use LoggerChannelTrait;

    private static $requests = [];
    /**
     * HTTP client.
     *
     * @var \GuzzleHttp\ClientInterface client
     */
    private $client;

    /**
     * A NR API Key
     *
     * @var apiKey
     */
    private $apiKey;

    /**
     * The NR Metrics endpoint base url
     *
     * @var baseUrl
     */
    private $baseUrl;

    /**
     * The CF or local application name
     *
     * @var applicationName
     */
    private $applicationName;

    public function __construct(ClientInterface $httpClient)
    {
        $this->client = $httpClient;
        $this->apiKey = Settings::get("new_relic_rpm.api_key");
        $this->baseUrl = Settings::get("new_relic_rpm.metrics.base_url") ?? "";
        $this->applicationName = Settings::get("wx.application_name");
        if (!$this->applicationName) {
            $this->applicationName = "local";
        }
    }

    public function sendMetric(
        $name,
        $num,
        $attributes,
        $type = "gauge",
        $now = false,
    ) {
        $now = $now ?? time();

        $attributes["applicationName"] = $this->applicationName;

        $headers = [
            "Content-Type" => "application/json",
            "Api-Key" => $this->apiKey,
        ];
        $postData = [
            [
                "metrics" => [
                    [
                        "name" => $name,
                        "type" => $type,
                        "value" => $num,
                        "timestamp" => $now,
                        "attributes" => $attributes,
                    ],
                ],
            ],
        ];

        $promise = $this->client->requestAsync("POST", $this->baseUrl, [
            "headers" => $headers,
            "json" => json_encode($postData),
        ]);

        return $promise->then(
            null, // success
            function ($err) {
                $logger = $this->getLogger("NEWRELIC");
                $logger->error($err->getMessage());
            },
        );
    }
}
