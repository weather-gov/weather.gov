<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\StringTranslation\TranslationInterface;
use GuzzleHttp\ClientInterface;

/**
 * A service class for fetching weather data.
 */
class WeatherDataService {
  /**
   * Mapping of legacy API icon paths to new icons and conditions text.
   *
   * @var legacyMapping
   */
  private $legacyMapping;

  /**
   * HTTP client.
   *
   * @var \GuzzleHttp\ClientInterface client
   */
  private $client;

  /**
   * Translation provider.
   *
   * @var \Drupal\Core\StringTranslation\TranslationInterface t
   */
  private $t;

  /**
   * Constructor.
   */
  public function __construct(ClientInterface $httpClient, TranslationInterface $t) {
    $this->client = $httpClient;
    $this->t = $t;

    $this->legacyMapping = json_decode(
      file_get_contents(
        __DIR__ . "/legacyMapping.json"
      )
    );
  }

  /**
   * Gets a unique key identifying the conditions described in an observation.
   *
   * @param object $observation
   *   An observation from api.weather.gov.
   *
   * @return string
   *   A key uniquely identifying the current conditions.
   */
  private function getApiObservationKey($observation) {
    /* The icon path from the API is of the form:
    https://api.weather.gov/icons/land/day/skc

    The last two path segments are the ones we need to identify the current
    conditions.
     */
    $icon = $observation->icon;

    if ($icon == NULL or strlen($icon) == 0) {
      return "no data";
    }

    $url = parse_url($observation->icon);
    $apiConditionKey = implode("/", array_slice(explode("/", $url["path"]), -2));
    return $apiConditionKey;
  }

  /**
   * Get a WFO grid from a latitude and longitude.
   */
  public function getGridFromLatLon($lat, $lon) {
    try {
      $locationResponse = $this->client->get("https://api.weather.gov/points/$lat,$lon");
      $locationMetadata = json_decode($locationResponse->getBody());

      return [
        "wfo" => $locationMetadata->properties->gridId,
        "gridX" => $locationMetadata->properties->gridX,
        "gridY" => $locationMetadata->properties->gridY,
        "location" => $locationMetadata->properties->relativeLocation->properties->city,
      ];

    }
    catch (\Throwable $e) {
      // Need to check the error so we know whether we ought to log something.
      // But not yet. I am too excited about this location stuff right now.
      return NULL;
    }
  }

  /**
   * Get the current weather conditions at a location.
   *
   * The location is taken from the provided route.
   *
   * @return array
   *   The current conditions as an associative array, or
   *   NULL if no route is provided, or the provided route is not on the grid.
   */
  public function getCurrentConditions($route) {
    // If this isn't a grid route, don't do anything. We can only respond to
    // requests on the grid.
    if ($route->getRouteName() != "weather_routes.grid") {
      return NULL;
    }

    // Since we're on the right kind of route, pull out the data we need.
    $wfo = $route->getParameter("wfo");
    $gridX = $route->getParameter("gridX");
    $gridY = $route->getParameter("gridY");
    $location = $route->getParameter("location");

    date_default_timezone_set('America/New_York');

    $obsStationsResponse = $this->client->get("https://api.weather.gov/gridpoints/$wfo/$gridX,$gridY/stations");
    $obsStationsMetadata = json_decode($obsStationsResponse->getBody());

    $observationStation = $obsStationsMetadata->features[0];

    $obsResponse = $this->client->get($observationStation->id . "/observations?limit=1");
    $obs = json_decode($obsResponse->getBody())->features[0]->properties;

    $timestamp = \DateTime::createFromFormat(\DateTimeInterface::ISO8601, $obs->timestamp);

    $feelsLike = $obs->heatIndex->value;
    if ($feelsLike == NULL) {
      $feelsLike = $obs->windChill->value;
    }
    if ($feelsLike == NULL) {
      $feelsLike = $obs->temperature->value;
    }
    $feelsLike = 32 + (9 * $feelsLike / 5);

    $obsKey = $this->getApiObservationKey($obs);

    $description = $this->legacyMapping->$obsKey->conditions;

    // The cardinal and ordinal directions. North goes in twice because it sits
    // in two "segments": -22.5° to 22.5°, and 337.5° to 382.5°.
    $directions = ["north", "northeast", "east", "southeast", "south",
      "southwest", "west", "northwest", "north",
    ];
    $shortDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];

    // 1. Whatever degrees we got from the API, constrain it to 0°-360°.
    // 2. Add 22.5° to it. This accounts for north starting at -22.5°
    // 3. Use integer division by 45° to see which direction index this is.
    // This indexes into the two direction name arrays above.
    $directionIndex = (int) (($obs->windDirection->value % 360) + 22.5) / 45;

    return [
      'conditions' => [
        'long' => $this->t->translate($description),
        'short' => $this->t->translate($description),
      ],
      // C to F.
      'feels_like' => (int) round($feelsLike),
      'humidity' => (int) round($obs->relativeHumidity->value ?? 0),
      'icon' => $this->legacyMapping->$obsKey->icon,
      'location' => $location,
      // C to F.
      'temperature' => (int) round(32 + (9 * $obs->temperature->value / 5)),
      'timestamp' => [
        'formatted' => $timestamp->format("l g:i A T"),
        'utc' => (int) $timestamp->format("U"),
      ],
      'wind' => [
        // Kph to mph.
        'speed' => (int) round($obs->windSpeed->value * 0.6213712),
        'angle' => $obs->windDirection->value,
        'direction' => $directions[$directionIndex],
        'shortDirection' => $shortDirections[$directionIndex],
      ],
    ];
  }

}
