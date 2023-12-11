<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\Logger\LoggerChannelTrait;
use Drupal\Core\StringTranslation\TranslationInterface;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\ServerException;

/**
 * A service class for fetching weather data.
 */
class WeatherDataService {
  use LoggerChannelTrait;

  /**
   * Mapping of legacy API icon paths to new icons and conditions text.
   *
   * @var legacyMapping
   */
  private $legacyMapping;

  /**
   * A catch-all default icon to show.
   *
   * @var string
   */
  private $defaultIcon;

  /**
   * A catch-all conditions label to display.
   *
   * @var defaultConditions
   */
  private $defaultConditions;

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
   * Cache of current conditions.
   *
   * @var currentConditions
   */
  private $currentConditions;

  /**
   * Cache of API calls for this request.
   *
   * @var apiCache
   */
  private $apiCache;

  /**
   * Constructor.
   */
  public function __construct(ClientInterface $httpClient, TranslationInterface $t) {
    $this->client = $httpClient;
    $this->t = $t;
    $this->defaultIcon = "nodata.svg";
    $this->defaultConditions = "No data";

    $this->currentConditions = FALSE;

    $this->apiCache = [];

    $this->legacyMapping = json_decode(
      file_get_contents(
        __DIR__ . "/legacyMapping.json"
      )
    );
  }

  /**
   * Get data from the weather API.
   *
   * The results for any given URL are cached for the duration of the current
   * response. The cache is not persisted across responses.
   *
   * Disable phpcs on the next line because it does not like method names with
   * sequential uppercase characters, but... I'm not camel-casing "API".
   */
  public function getFromWeatherAPI($url, $attempt = 1, $delay = 75) { // phpcs:ignore
    if (!array_key_exists($url, $this->apiCache)) {
      try {
        $response = $this->client->get($url);
        $response = json_decode($response->getBody());
        $this->apiCache[$url] = $response;
      }
      catch (ServerException $e) {

        $logger = $this->getLogger("Weather.gov data service");
        $logger->notice("got 500 error on attempt $attempt for: $url");

        // Back off and try again.
        if ($attempt < 5) {
          // Sleep is in microseconds, so scale it up to milliseconds.
          usleep($delay * 1000);
          return $this->getFromWeatherAPI($url, $attempt + 1, $delay * 1.65);
        }

        $logger->error("giving up on: $url");
        throw $e;
      }

    }

    return $this->apiCache[$url];
  }

  /**
   * Return only the periods that are after today.
   *
   * This private method will filter the forecast periods
   * to only include periods whose startTime corresponds to
   * "tomorrow" or later.
   *
   * The optional argument $limitDays, if set,
   * should be an integer specifying the max number
   * of days to return. Note that a day is two periods
   * (daytime and overnight) combined.
   *
   * @return array
   *   An array of forecast period data filtered as described
   */
  public function filterToFutureDays($data, $now, $limitDays = NULL) {
    $tomorrow = $now->modify('tomorrow');
    $result = array_filter($data, function ($period) use (&$tomorrow) {
      $startTime = \DateTimeImmutable::createFromFormat(
        \DateTimeInterface::ISO8601,
        $period->startTime
      );
      return $startTime > $tomorrow;
    });

    // Each period here is half a day
    // (the morning or the night), so
    // we need double the limit periods.
    if ($limitDays != NULL) {
      return array_values(
        array_slice($result, 0, $limitDays * 2)
      );
    }

    return array_values($result);
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
  public function getApiObservationKey($observation) {
    /* The icon path from the API is of the form:
    https://api.weather.gov/icons/land/day/skc
    - OR -
    https://api.weather.gov/icons/land/day/skc/hurricane

    The last two or three path segments are the ones we need
    to identify the current conditions. This is because there can be
    two simultaneous conditions in the legacy icon system.

    For now, we use the _first_ condition given in the path as the canonical
    condition for the key.
     */
    $icon = $observation->icon;

    if ($icon == NULL or strlen($icon) == 0) {
      return "no data";
    }

    $url = parse_url($observation->icon);
    $path = $url["path"];
    $path = explode("/", $path);

    // An icon url, when split to path parts,
    // with have either 5 or 6 parts.
    // Thus we need to trim from the end by
    // either 2 or 3 each time.
    if (count($path) == 6) {
      $path = array_slice($path, -3, 2);
    }
    else {
      $path = array_slice($path, -2);
    }

    $path = array_map(function ($piece) {
      return preg_replace("/,.*$/", "", $piece);
    }, $path);

    $apiConditionKey = implode("/", $path);

    return $apiConditionKey;
  }

  /**
   * Get a WFO grid from a latitude and longitude.
   */
  public function getGridFromLatLon($lat, $lon) {
    try {
      $locationMetadata = $this->getFromWeatherAPI("https://api.weather.gov/points/$lat,$lon");

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
   * Get a place from a WFO grid.
   */
  public function getPlaceFromGrid($wfo, $x, $y) {
    $geometry = $this->getGeometryFromGrid($wfo, $x, $y);
    $point = $geometry[0];

    return $this->getPlaceFromLatLon($point->lat, $point->lon);
  }

  /**
   * Get a place from a latitude and longitude.
   */
  public function getPlaceFromLatLon($lat, $lon) {
    $point = $this->getFromWeatherAPI("https://api.weather.gov/points/$lat,$lon");
    $place = $point->properties->relativeLocation->properties;

    return (object) [
      "city" => $place->city,
      "state" => $place->state,
    ];
  }

  /**
   * Get a geometry from a WFO grid.
   *
   * @return stdClass
   *   An array of points representing the vertices of the WFO grid polygon.
   */
  public function getGeometryFromGrid($wfo, $x, $y) {
    $gridpoint = $this->getFromWeatherAPI("https://api.weather.gov/gridpoints/$wfo/$x,$y");
    $geometry = $gridpoint->geometry->coordinates[0];

    return array_map(function ($geo) {
      return (object) [
        "lat" => $geo[1],
        "lon" => $geo[0],
      ];
    }, $geometry);
  }

  /**
   * Get the current weather conditions at a WFO grid location.
   */
  public function getCurrentConditionsFromGrid($wfo, $gridX, $gridY) {

    date_default_timezone_set('America/New_York');

    $obsStationsMetadata = $this->getFromWeatherAPI("https://api.weather.gov/gridpoints/$wfo/$gridX,$gridY/stations");

    $observationStation = $obsStationsMetadata->features[0];

    $obs = $this->getFromWeatherAPI($observationStation->id . "/observations?limit=1")->features[0]->properties;

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

    $description = ucfirst(strtolower($obs->textDescription));

    // The cardinal and ordinal directions. North goes in twice because it
    // sits in two "segments": -22.5° to 22.5°, and 337.5° to 382.5°.
    $directions = ["north", "northeast", "east", "southeast", "south",
      "southwest", "west", "northwest", "north",
    ];
    $shortDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];

    // 1. Whatever degrees we got from the API, constrain it to 0°-360°.
    // 2. Add 22.5° to it. This accounts for north starting at -22.5°
    // 3. Use integer division by 45° to see which direction index this is.
    // This indexes into the two direction name arrays above.
    $directionIndex = intdiv(intval(($obs->windDirection->value % 360) + 22.5, 10), 45);

    return [
      'conditions' => [
        'long' => $this->t->translate($description),
        'short' => $this->t->translate($description),
      ],
      // C to F.
      'feels_like' => (int) round($feelsLike),
      'humidity' => (int) round($obs->relativeHumidity->value ?? 0),
      'icon' => $this->legacyMapping->$obsKey->icon,
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

  /**
   * Get the hourly forecast for a location.
   *
   * Note that the $now object should *NOT* be set. It's a dependency injection
   * hack so we can mock the current date/time.
   *
   * @return array
   *   The hourly forecast as an associative array.
   */
  public function getHourlyForecastFromGrid($wfo, $gridX, $gridY, $now = FALSE) {
    if (!($now instanceof \DateTimeImmutable)) {
      $now = new \DateTimeImmutable();
    }

    date_default_timezone_set('America/New_York');

    $forecast = $this->getFromWeatherAPI("https://api.weather.gov/gridpoints/$wfo/$gridX,$gridY/forecast/hourly");

    // Get a point from the WFO grid. Any will do. We will use that to fetch the
    // appropriate timezone from the /points API endpoint.
    $point = $forecast->geometry->coordinates[0][0];
    $timezone = $this->getFromWeatherAPI("https://api.weather.gov/points/$point[1],$point[0]");
    $timezone = $timezone->properties->timeZone;

    $forecast = $forecast->properties->periods;

    // Toss out any time periods in the past.
    $forecast = array_filter($forecast, function ($period) use (&$now) {
      $then = \DateTimeImmutable::createFromFormat(
        \DateTimeInterface::ISO8601_EXPANDED,
        $period->startTime
      );
      $diff = $now->diff($then, FALSE);

      return $diff->invert != 1;
    });

    // Now map all those forecast periods into the structure we want.
    $forecast = array_map(function ($period) use (&$timezone) {

      // This closure needs access to the $timezone variable about. The easiest
      // way I found to do it was using it by reference.
      // From the start period of the time, parse it as an ISO8601 string and
      // then format it into just the "Hour AM/PM" format (e.g., "8 PM")
      $timestamp = \DateTimeImmutable::createFromFormat(
        \DateTimeInterface::ISO8601_EXPANDED,
        $period->startTime
      )->setTimeZone(new \DateTimeZone($timezone))
        ->format("g A");

      $obsKey = $this->getApiObservationKey($period);

      return [
        "conditions" => $this->t->translate(ucfirst(strtolower($period->shortForecast))),
        "icon" => $this->legacyMapping->$obsKey->icon,
        "probabilityOfPrecipitation" => $period->probabilityOfPrecipitation->value,
        "time" => $timestamp,
        "temperature" => $period->temperature,
      ];
    }, $forecast);

    // Reindex the array. array_filter maintains indices, so it can result in
    // holes in the array. Bizarre behavior choice, but okay...
    return array_values($forecast);
  }

  /**
   * Get the daily forecast for a location.
   *
   * Note that the $now object should *NOT* be set. It's a dependency injection
   * hack so we can mock the current date/time.
   *
   * @return array
   *   The daily forecast as an associative array.
   */
  public function getDailyForecastFromGrid($wfo, $gridX, $gridY, $now = FALSE, $defaultDays = 5) {
    $forecast = $this->getFromWeatherAPI("https://api.weather.gov/gridpoints/$wfo/$gridX,$gridY/forecast");

    $periods = $forecast->properties->periods;

    // In order to keep the time zones straight,
    // we set the "current" (now) time to be
    // the startTime of the first period.
    if (!($now instanceof \DateTimeImmutable)) {
      $now = \DateTimeImmutable::createFromFormat(
        \DateTimeInterface::ISO8601_EXPANDED,
        $periods[0]->startTime
      );
    }
    $periods = $this->filterToFutureDays($periods, $now, $defaultDays);

    // Periods are either daytime or nighttime
    // We can zip them together as pairs.
    $dayNightPairs = array_chunk($periods, 2);

    $periods = array_map(function ($periodPair) {
      $daytime = $periodPair[0];
      $overnight = $periodPair[1];

      // Daily forecast cards require the three-letter
      // abrreviated form of the day name.
      $startTime = \DateTimeImmutable::createFromFormat(
        \DateTimeInterface::ISO8601,
        $daytime->startTime
      );
      $shortDayName = $startTime->format('D');

      // Get any mapped condition and/or icon values.
      $obsKey = $this->getApiObservationKey($daytime);

      // Sentence-case the forecast description.
      $shortForecast = ucfirst(strtolower($daytime->shortForecast));

      $daytimeForecast = [
        'shortDayName' => $shortDayName,
        'startTime' => $daytime->startTime,
        'shortForecast' => $this->t->translate($shortForecast),
        'icon' => $this->legacyMapping->$obsKey->icon,
        'temperature' => $daytime->temperature,
        'probabilityOfPrecipitation' => $daytime->probabilityOfPrecipitation->value,
      ];

      $overnightForecast = [
        'temperature' => $overnight->temperature,
      ];

      return [
        'daytime' => $daytimeForecast,
        'overnight' => $overnightForecast,
      ];

    }, $dayNightPairs);

    return array_values($periods);
  }

}
