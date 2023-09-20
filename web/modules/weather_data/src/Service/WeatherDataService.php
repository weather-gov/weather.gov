<?php

namespace Drupal\weather_data\Service;

/**
 * A service class for fetching weather data.
 */
class WeatherDataService {

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

    $client = \Drupal::httpClient();

    $locationResponse = $client->get("https://api.weather.gov/points/$lat,$lon");
    $locationMetadata = json_decode($locationResponse->getBody());
    $location = $locationMetadata->properties->relativeLocation->properties->city;

    $observationStations = $locationMetadata->properties->observationStations;
    $obsStationsResponse = $client->get($observationStations);
    $obsStationsMetadata = json_decode($obsStationsResponse->getBody());

    $observationStation = $obsStationsMetadata->features[0];

    $obsResponse = $client->get($observationStation->id . "/observations?limit=1");
    $obs = json_decode($obsResponse->getBody())->features[0]->properties;

    return [
      'conditions' => [
        'long' => $obs->textDescription,
        'short' => $obs->textDescription,
      ],
      'feels_like' => round(32 + (9 * $obs->heatIndex->value / 5)),
      'humidity' => round($obs->relativeHumidity->value),
      'icon' => 'showers_scattered_rain.svg',
      'location' => $location,
      'temperature' => round(32 + (9 * $obs->temperature->value / 5)),
      'timestamp' => [
        'formatted' => date("l g:i A T"),
        'utc' => time(),
      ],
      'wind' => [
        'speed' => round($obs->windSpeed->value * 0.6213712),
        'direction' => $obs->windDirection->value,
      ],
    ];
  }

}
