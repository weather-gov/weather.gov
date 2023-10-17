<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\StringTranslation\TranslationInterface;
use GuzzleHttp\ClientInterface;

/**
 * Gets a unique key identifying the conditions described in an observation.
 *
 * @param object $observation
 *   An observation from api.weather.gov.
 *
 * @return string
 *   A key uniquely identifying the current conditions.
 */
function get_api_condition_key($observation) {
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
 * Gets a NOAA weather icon filename from a current observation.
 *
 * @param object $observation
 *   An observation from api.weather.gov.
 *
 * @return string
 *   The filename for the associated NOAA weather icon.
 */
function get_noaa_icon($observation) {
  $apiKeyToNoaaIconMapping = [
    "day/bkn" => "mostly_cloudy-day.svg",
    "night/bkn" => "mostly_cloudy-night.svg",
    "day/blizzard" => "blizzard_winter_storm.svg",
    "night/blizzard" => "blizzard_winter_storm.svg",
    "day/cold" => "cold.svg",
    "night/cold" => "cold.svg",
    "day/dust" => "new_dust.svg",
    "night/dust" => "new_dust.svg",
    "day/few" => "mostly_clear-day.svg",
    "night/few" => "mostly_clear-night.svg",
    "day/fog" => "fog.svg",
    "night/fog" => "fog.svg",
    "day/fzra" => "cold.svg",
    "night/fzra" => "cold.svg",
    "day/haze" => "hazy_smoke-day.svg",
    "night/haze" => "fog.svg",
    "day/hot" => "hot.svg",
    "night/hot" => "hot.svg",
    "day/hurricane" => "hurricane.svg",
    "night/hurricane" => "hurricane.svg",
    "no data" => "nodata.svg",
    "day/ovc" => "cloudy_overcast.svg",
    "night/ovc" => "cloudy_overcast.svg",
    "day/rain" => "rain.svg",
    "day/rain_fzra" => "freezing_rain_sleet.svg",
    "night/rain_fzra" => "freezing_rain_sleet.svg",
    "night/rain" => "rain.svg",
    "day/rain_showers" => "showers_scattered_rain.svg",
    "day/rain_showers_hi" => "showers_scattered_rain.svg",
    "night/rain_showers_hi" => "showers_scattered_rain.svg",
    "night/rain_showers" => "rain_showers.svg",
    "day/rain_sleet" => "freezing_rain_sleet.svg",
    "night/rain_sleet" => "freezing_rain_sleet.svg",
    "day/rain_snow" => "mixed_precip.svg",
    "night/rain_snow" => "mixed_precip.svg",
    "day/sct" => "mostly_clear-day.svg",
    "night/sct" => "mostly_clear-night.svg",
    "day/skc" => "clear-day.svg",
    "night/skc" => "clear-night.svg",
    "day/sleet" => "freezing_rain_sleet.svg",
    "night/sleet" => "freezing_rain_sleet.svg",
    "day/smoke" => "hazy_smoke-day.svg",
    "night/smoke" => "hazy_smoke-day.svg",
    "day/snow" => "snow.svg",
    "day/snow_fzra" => "mixed_precip.svg",
    "night/snow_fzra" => "mixed_precip.svg",
    "night/snow" => "snow.svg",
    "day/snow_sleet" => "new_snow_sleet.svg",
    "night/snow_sleet" => "new_snow_sleet.svg",
    "day/tornado" => "tornado.svg",
    "night/tornado" => "tornado.svg",
    "day/tropical_storm" => "hurricane.svg",
    "night/tropical_storm" => "hurricane.svg",
    "day/tsra" => "thunderstorm.svg",
    "day/tsra_hi" => "thunderstorm.svg",
    "night/tsra_hi" => "thunderstorm.svg",
    "night/tsra" => "thunderstorm.svg",
    "day/tsra_sct" => "thunderstorm.svg",
    "night/tsra_sct" => "thunderstorm.svg",
    "day/wind_bkn" => "new_windy_cloudy.svg",
    "night/wind_bkn" => "new_windy_cloudy.svg",
    "day/wind_few" => "new_windy_cloudy.svg",
    "night/wind_few" => "new_windy_cloudy.svg",
    "day/wind_ovc" => "new_windy_cloudy.svg",
    "night/wind_ovc" => "new_windy_cloudy.svg",
    "day/wind_sct" => "new_windy_cloudy.svg",
    "night/wind_sct" => "new_windy_cloudy.svg",
    "day/wind_skc" => "windy.svg",
    "night/wind_skc" => "windy.svg",
  ];

  $conditionKey = get_api_condition_key($observation);
  return $apiKeyToNoaaIconMapping[$conditionKey];
}

/**
 * Gets a short weather description from a current observation.
 *
 * @param object $observation
 *   An observation from api.weather.gov.
 *
 * @return string
 *   The short description of the weather described in the observation.
 */
function get_short_description($observation) {
  $apiKeyToConditionMapping = [
    "day/bkn" => "Mostly cloudy",
    "night/bkn" => "Mostly cloudy",
    "day/blizzard" => "Blizzard",
    "night/blizzard" => "Blizzard",
    "day/cold" => "Cold",
    "night/cold" => "Cold",
    "day/dust" => "Dust",
    "night/dust" => "Dust",
    "day/few" => "A few clouds",
    "night/few" => "A few clouds",
    "day/fog" => "Fog/mist",
    "night/fog" => "Fog/mist",
    "day/fzra" => "Freezing rain",
    "night/fzra" => "Freezing rain",
    "day/haze" => "Haze",
    "night/haze" => "Haze",
    "day/hot" => "Hot",
    "night/hot" => "Hot",
    "day/hurricane" => "Hurricane conditions",
    "night/hurricane" => "Hurricane conditions",
    "no data" => "No data",
    "day/ovc" => "Overcast",
    "night/ovc" => "Overcast",
    "day/rain" => "Rain",
    "day/rain_fzra" => "Rain/freezing rain",
    "night/rain_fzra" => "Rain/freezing rain",
    "night/rain" => "Rain",
    "day/rain_showers" => "Rain showers (high cloud cover)",
    "day/rain_showers_hi" => "Rain showers (low cloud cover)",
    "night/rain_showers_hi" => "Rain showers (low cloud cover)",
    "night/rain_showers" => "Rain showers (high cloud cover)",
    "day/rain_sleet" => "Rain/sleet",
    "night/rain_sleet" => "Rain/sleet",
    "day/rain_snow" => "Rain/snow",
    "night/rain_snow" => "Rain/sleet",
    "day/sct" => "Partly cloudy",
    "night/sct" => "Partly cloudy",
    "day/skc" => "Fair/clear",
    "night/skc" => "Fair/clear",
    "day/sleet" => "Sleet",
    "night/sleet" => "Sleet",
    "day/smoke" => "Smoke",
    "night/smoke" => "Smoke",
    "day/snow" => "Snow",
    "day/snow_fzra" => "Freezing rain/snow",
    "night/snow_fzra" => "Freezing rain/snow",
    "night/snow" => "Snow",
    "day/snow_sleet" => "Snow/sleet",
    "night/snow_sleet" => "Snow/sleet",
    "day/tornado" => "Tornado",
    "night/tornado" => "Tornado",
    "day/tropical_storm" => "Tropical storm conditions",
    "night/tropical_storm" => "Tropical storm conditions",
    "day/tsra" => "Thunderstorm (high cloud cover)",
    "day/tsra_hi" => "Thunderstorm (low cloud cover)",
    "night/tsra_hi" => "Thunderstorm (low cloud cover)",
    "night/tsra" => "Thunderstorm (high cloud cover)",
    "day/tsra_sct" => "Thunderstorm (medium cloud cover)",
    "night/tsra_sct" => "Thunderstorm (medium cloud cover)",
    "day/wind_bkn" => "Mostly cloudy and windy",
    "night/wind_bkn" => "Mostly cloudy and windy",
    "day/wind_few" => "A few clouds and windy",
    "night/wind_few" => "A few clouds and windy",
    "day/wind_ovc" => "Overcast and windy",
    "night/wind_ovc" => "Overcast and windy",
    "day/wind_sct" => "Partly cloudy and windy",
    "night/wind_sct" => "Partly cloudy and windy",
    "day/wind_skc" => "Fair/clear and windy",
    "night/wind_skc" => "Fair/clear and windy",
  ];

  $key = get_api_condition_key($observation);
  return $apiKeyToConditionMapping[$key];
}

/**
 * A service class for fetching weather data.
 */
class WeatherDataService {
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

    $description = get_short_description($obs);

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
      'icon' => get_noaa_icon($obs) ,
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
