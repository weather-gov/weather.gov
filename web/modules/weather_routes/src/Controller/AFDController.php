<?php

declare(strict_types=1);

namespace Drupal\weather_routes\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Drupal\weather_data\Service\WeatherDataService;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Responses for AFD retrieval routes
 *
 */
final class AFDController extends ControllerBase
{
    /**
     * A service for fetching weather data.
     *
     * @var WeatherDataService weatherData
     */
    private $weatherData;
    private $request;

    /**
     * Constructor for dependency injection.
     */
    public function __construct($weatherData, $request)
    {
        $this->weatherData = $weatherData;
        $this->request = $request;
    }

    /**
     * {@inheritdoc}
     */
    public static function create(ContainerInterface $container)
    {
        return new static(
            $container->get("weather_data"),
            $container->get("request_stack"),
        );
    }

    public function content()
    {
        $wfo = $this->request->getCurrentRequest()->query->get("wfo");
        $afd = $this->weatherData->getLatestAFD($wfo);
        return [
            "#theme" => "weather_routes_afd",
            "#wfo" => $wfo,
            "#afd" => $afd,
        ];
    }
}
