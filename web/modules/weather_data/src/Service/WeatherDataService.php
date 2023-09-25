<?php

namespace Drupal\weather_data\Service;

use GuzzleHttp\ClientInterface;

/**
 * Converts an api.weather.gov icon path to a NOAA weather icon filename.
 *
 * @param string $apiIconPath
 *   The path returned by api.weather.gov.
 *
 * @return string
 *   The filename for the associated NOAA weather icon.
 */
function get_noaa_icon($apiIconPath) {
  $apiIconToNoaaMapping = [
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
    "day/sct" => "mosty_cleary-day.svg",
    "night/sct" => "mosty_cleary-night.svg",
    "day/skc" => "clear_day.svg",
    "night/skc" => "clear_night.svg",
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

  /* The icon path from the API is of the form:
  https://api.weather.gov/icons/land/day/skc

  The last two path segments are the ones we need.
   */
  $url = parse_url($apiIconPath);
  $apiIconName = implode("/", array_slice(explode("/", $url["path"]), -2));

  return $apiIconToNoaaMapping[$apiIconName];
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
   * Constructor.
   */
  public function __construct(ClientInterface $httpClient) {
    $this->client = $httpClient;
  }

  /**
   * Get the current weather conditions at a location.
   *
   * LOCATION TBD.
   */
  public function getCurrentConditions() {
    date_default_timezone_set('America/New_York');

    // Roughly Minneapolis.
    $lat = 44.98;
    $lon = -93.27;

    $locationResponse = $this->client->get("https://api.weather.gov/points/$lat,$lon");
    $locationMetadata = json_decode($locationResponse->getBody());
    $location = $locationMetadata->properties->relativeLocation->properties->city;

    $observationStations = $locationMetadata->properties->observationStations;
    $obsStationsResponse = $this->client->get($observationStations);
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

    return [
      'conditions' => [
        'long' => $obs->textDescription,
        'short' => $obs->textDescription,
      ],
      // C to F.
      'feels_like' => round($feelsLike),
      'humidity' => round($obs->relativeHumidity->value),
      'icon' => get_noaa_icon($obs->icon) ,
      'location' => $location,
      // C to F.
      'temperature' => round(32 + (9 * $obs->temperature->value / 5)),
      'timestamp' => [
        'formatted' => $timestamp->format("l g:i A T"),
        'utc' => (int) $timestamp->format("U"),
      ],
      'wind' => [
        // Kph to mph.
        'speed' => round($obs->windSpeed->value * 0.6213712),
        'direction' => $obs->windDirection->value,
      ],
    ];
  }

}
