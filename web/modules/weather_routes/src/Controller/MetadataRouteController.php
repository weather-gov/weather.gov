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
final class MetadataRouteController extends ControllerBase
{
    /**
     * A service for fetching weather data.
     *
     * @var \GuzzleHttp\ClientInterface HTTP client object
     */
    private $httpClient;

    /**
     * Constructor for dependency injection.
     */
    public function __construct($httpClient)
    {
        $this->httpClient = $httpClient;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(ContainerInterface $container)
    {
        return new static($container->get("http_client"));
    }

    public function listAlerts()
    {
        $baseUrl = getEnv("API_INTEROP_URL");
        try {
            $alerts = $this->httpClient
                ->get("$baseUrl/meta/alerts")
                ->getBody()
                ->getContents();

            return [
                "#theme" => "weather_routes_info_alerts",
                "#alerts" => json_decode($alerts),
            ];
        } catch (Throwable $e) {
        }
    }
}
