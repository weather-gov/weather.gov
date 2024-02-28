<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\Logger\LoggerChannelTrait;
use Drupal\Core\StringTranslation\TranslationInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * A service class for fetching weather data.
 */
class WeatherDataService
{
    use HourlyForecastTrait;
    use LoggerChannelTrait;
    use UnitConversionTrait;
    use WeatherAlertTrait;

    protected const NUMBER_OF_OBS_STATIONS_TO_TRY = 3;

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
     * Translation provider.
     *
     * @var \Drupal\Core\StringTranslation\TranslationInterface t
     */
    private $t;

    /**
     * The request currently being responded to.
     *
     * @var request
     */
    private $request;

    /**
     * A cached version of any fetched alerts
     */
    private $stashedAlerts;

    /**
     * NewRelic API handler
     */
    private $newRelic;

    /**
     * Geometry of a WFO grid cell (stashed per request)
     *
     * @var stashedGridGeometry
     */
    public $stashedGridGeometry;

    /**
     * A lat/lon pair as an array (stashed per request)
     *
     * @var stashedPoint
     */
    public $stashedPoint;

    /**
     * Constructor.
     */
    public function __construct(
        TranslationInterface $t,
        RequestStack $r,
        NewRelicMetrics $newRelic,
        DataLayer $dataLayer,
    ) {
        $this->dataLayer = $dataLayer;
        $this->t = $t;
        $this->request = $r->getCurrentRequest();
        $this->newRelic = $newRelic;

        $this->defaultIcon = "nodata.svg";
        $this->defaultConditions = "No data";

        $this->stashedGridGeometry = null;
        $this->stashedPoint = null;

        $this->legacyMapping = json_decode(
            file_get_contents(__DIR__ . "/legacyMapping.json"),
        );

        $this->stashedAlerts = null;

        // For a given request, assign it a response ID. We'll send this in the
        // headers to the API. If we've already gotten an ID for this response,
        // keep it.
        $this->responseId = uniqid();
    }

    /**
     * Check if an observation is valid.
     */
    protected function isValidObservation($obs)
    {
        if ($obs->temperature->value == null) {
            return false;
        }
        return true;
    }

    /**
     * Return only periods that are today/tonight
     * This private method will filter the forecast periods
     * to only include periods whose startTime corresponds
     * to "today" "tonight" or "overnight"
     *
     * The response will be a new assoc array that
     * is formatted correctly
     */
    public function filterToToday($data, $now)
    {
        $tomorrow = $now->modify("tomorrow");
        $result = array_filter($data, function ($period) use (&$tomorrow) {
            $startTime = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $period->startTime,
            );
            return $startTime < $tomorrow;
        });

        $periods = array_values($result);

        return $periods;
    }

    public function formatDailyPeriod($period)
    {
        // Early return if we haven't passed in anything
        if (!$period) {
            return null;
        }

        // Daily forecast cards require the three-letter
        // abrreviated form of the day name.
        $startTime = \DateTimeImmutable::createFromFormat(
            \DateTimeInterface::ISO8601_EXPANDED,
            $period->startTime,
        );

        $shortDayName = $startTime->format("D");
        $dayName = $startTime->format("l");
        $monthAndDay = $startTime->format("M j");

        // Sentence-case the forecast description.
        $shortForecast = ucfirst(strtolower($period->shortForecast));

        // Return a formatted assoc array that can be
        // used by the templates
        return [
            "shortDayName" => $shortDayName,
            "dayName" => $dayName,
            "monthAndDay" => $monthAndDay,
            "startTime" => $period->startTime,
            "shortForecast" => $this->t->translate($shortForecast),
            "icon" => $this->getIcon($period),
            "temperature" => $period->temperature,
            "probabilityOfPrecipitation" =>
                $period->probabilityOfPrecipitation->value,
            "isDaytime" => $period->isDaytime,
        ];
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
    public function filterToFutureDays($data, $now, $limitDays = null)
    {
        $tomorrow = $now->modify("tomorrow");
        $result = array_filter($data, function ($period) use (&$tomorrow) {
            $startTime = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601,
                $period->startTime,
            );
            return $startTime > $tomorrow;
        });

        // Each period here is half a day
        // (the morning or the night), so
        // we need double the limit periods.
        if ($limitDays != null) {
            return array_values(array_slice($result, 0, $limitDays * 2));
        }

        return array_values($result);
    }

    /**
     * Return only periods that are in the "extended" daily
     *
     * "Extended" would be all the periods after the
     * limited number of days to forecast in detail in
     * a daily forecast, as returned by the API.
     *
     * @return array
     *   An array of daily periods filtered as described
     */
    public function filterToExtendedPeriods(
        $data,
        $now,
        $numDetailedDays = null,
    ) {
        // First, get all future periods in an array,
        // but do not yet skip over the number of detailed days
        $futurePeriods = $this->filterToFutureDays($data, $now);

        // Now we return a sliced version of the array that
        // starts after the index of the last number of detailed
        // days (ie the "extended" periods).
        // Note that because a "day" is two periods, we double the
        // start index number
        if ($numDetailedDays) {
            return array_slice($futurePeriods, $numDetailedDays * 2);
        }

        return $futurePeriods;
    }

    /**
     * Gets weather.gov icon information from api.weather.gov icon.
     */
    public function getIcon($observation)
    {
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
        $icon = (object) ["icon" => null, "base" => null];

        if ($observation->icon != null && strlen($observation->icon) > 0) {
            $url = parse_url($observation->icon);
            $path = $url["path"];
            $path = explode("/", $path);

            // An icon url, when split to path parts,
            // with have either 5 or 6 parts.
            // Thus we need to trim from the end by
            // either 2 or 3 each time.
            if (count($path) == 6) {
                $path = array_slice($path, -3, 2);
            } else {
                $path = array_slice($path, -2);
            }

            $path = array_map(function ($piece) {
                return preg_replace("/,.*$/", "", $piece);
            }, $path);

            $key = implode("/", $path);
            $icon->icon = $this->legacyMapping->$key->icon;

            $icon->base = basename($icon->icon, ".svg");
        }
        return $icon;
    }

    /**
     * Get a WFO grid from a latitude and longitude.
     */
    public function getGridFromLatLon($lat, $lon)
    {
        try {
            $locationMetadata = $this->dataLayer->getPoint($lat, $lon);

            $wfo = strtoupper($locationMetadata->properties->gridId);
            $gridX = $locationMetadata->properties->gridX;
            $gridY = $locationMetadata->properties->gridY;

            return (object) [
                "wfo" => $wfo,
                "x" => $gridX,
                "y" => $gridY,
            ];
        } catch (\Throwable $e) {
            // Need to check the error so we know whether we ought to log something.
            // But not yet. I am too excited about this location stuff right now.
            return null;
        }
    }

    /**
     * Get a place from a WFO grid.
     */
    public function getPlaceFromGrid($wfo, $x, $y, $self = false)
    {
        if (!$self) {
            $self = $this;
        }

        $gridpoint = $this->dataLayer->getGridpoint($wfo, $x, $y);
        $geometry = $gridpoint->geometry->coordinates[0];

        return $this->dataLayer->getPlaceNearPolygon($geometry);
    }

    /**
     * Compute and get distance information about observation
     *
     * Returns an assoc array with information about the distance
     * of a given observation station to a specified reference
     * geometry.
     *
     * For now the reference geometry is the polygon of
     * a WFO cell.
     *
     */
    public function getObsDistanceInfo(
        $referencePoint,
        $obs,
        $wfoGeometry,
        $index = 0,
    ) {
        $obsText =
            "POINT(" .
            $obs->geometry->coordinates[0] .
            " " .
            $obs->geometry->coordinates[1] .
            ")";

        // If we have a reference point, we use that.
        // Otherwise, use the closest point from the WFO
        // geometry
        if ($referencePoint) {
            $sourcePointText =
                "POINT(" .
                $referencePoint->lon .
                " " .
                $referencePoint->lat .
                ")";
        } else {
            // We need to find the closest point in the wfoGeometry
            // to the observation point
            $distance = INF;
            $closest = null;
            foreach ($wfoGeometry as $sourcePoint) {
                $lonDiff = $obs->geometry->coordinates[0] - $sourcePoint->lon;
                $latDiff = $obs->geometry->coordinates[1] - $sourcePoint->lat;
                $hyp = hypot($lonDiff, $latDiff);
                if ($hyp < $distance) {
                    $distance = $hyp;
                    $closest = $sourcePoint;
                }
            }
            $sourcePointText =
                "POINT(" . $closest->lon . " " . $closest->lat . ")";
        }

        $sourceGeomPoints = array_map(function ($point) {
            return $point->lon . " " . $point->lat;
        }, $wfoGeometry);
        $sourceGeomPoints = implode(", ", $sourceGeomPoints);
        $sourceGeomText = "POLYGON((" . $sourceGeomPoints . "))";

        $sql =
            "SELECT ST_DISTANCE_SPHERE(" .
            "ST_GEOMFROMTEXT('" .
            $obsText .
            "'), " .
            "ST_GEOMFROMTEXT('" .
            $sourcePointText .
            "')) as distance, " .
            "ST_WITHIN(ST_GEOMFROMTEXT('" .
            $obsText .
            "'), " .
            "ST_GEOMFROMTEXT('" .
            $sourceGeomText .
            "')) as within;";

        $result = $this->database->query($sql)->fetch();
        $distanceInfo = [
            "distance" => (float) $result->distance,
            "withinGridCell" => !!(int) $result->within,
            "usesReferencePoint" => !!$referencePoint,
            "obsPoint" => [
                "lon" => $obs->geometry->coordinates[0],
                "lat" => $obs->geometry->coordinates[1],
            ],
            "obsStation" => $obs->properties->station,
            "stationIndex" => $index,
        ];

        return $distanceInfo;
    }

    /**
     * Logs a serialized version of an obsDistanceInfo array
     *
     * (See getObsDistanceInfo() for how this array is produced)
     */
    public function logObservationDistanceInfo($obsDistanceInfo)
    {
        $promise = $this->newRelic->sendMetric(
            "wx.observation",
            $obsDistanceInfo["distance"],
            [
                "withinGridCell" => $obsDistanceInfo["withinGridCell"],
                "stationIndex" => $obsDistanceInfo["stationIndex"],
                "obsStation" => $obsDistanceInfo["obsStation"],
                "distance" => $obsDistanceInfo["distance"],
                "usesReferencePoint" => $obsDistanceInfo["usesReferencePoint"],
            ],
        );

        $promise->wait();
    }

    /**
     * Get a geometry from a WFO grid.
     *
     * @return stdClass
     *   An array of points representing the vertices of the WFO grid polygon.
     */
    public function getGeometryFromGrid($wfo, $x, $y)
    {
        if (!$this->stashedGridGeometry) {
            $gridpoint = $this->dataLayer->getGridpoint($wfo, $x, $y);
            $this->stashedGridGeometry = $gridpoint->geometry->coordinates[0];
        }

        return $this->stashedGridGeometry;
    }

    /**
     * Get the current weather conditions at a WFO grid location.
     */
    public function getCurrentConditionsFromGrid($wfo, $x, $y)
    {
        date_default_timezone_set("America/New_York");

        $obsStations = $this->dataLayer->getObservationStations($wfo, $x, $y);

        $gridGeometry = $this->getGeometryFromGrid($wfo, $gridX, $gridY);

        $obsStationIndex = 0;
        $observationStation = $obsStations[$obsStationIndex];

        do {
            // If the temperature is not available from this observation station, try
            // the next one. Continue through the first 3 stations and then give up.
            $observationStation = $obsStations[$obsStationIndex];
            $obs = $this->dataLayer->getCurrentObservation(
                $observationStation->properties->stationIdentifier,
            );
            $obsStationIndex += 1;
        } while (
            !$this->isValidObservation($obs) &&
            $obsStationIndex < count($obsStations) - 1 &&
            $obsStationIndex < self::NUMBER_OF_OBS_STATIONS_TO_TRY
        );
        if ($obs->temperature->value == null) {
            return null;
        }

        // Log observation distance information,
        // including the WFO grid and a reference point,
        // if available
        $distanceInfo = $self->getObsDistanceInfo(
            $this->stashedPoint,
            $obsData,
            $gridGeometry,
            $obsStationIndex - 1,
        );
        $self->logObservationDistanceInfo($distanceInfo);

        $timestamp = \DateTime::createFromFormat(
            \DateTimeInterface::ISO8601,
            $obs->timestamp,
        );

        $feelsLike = $this->getTemperatureScalar($obs->heatIndex);
        if ($feelsLike == null) {
            $feelsLike = $this->getTemperatureScalar($obs->windChill);
        }
        if ($feelsLike == null) {
            $feelsLike = $this->getTemperatureScalar($obs->temperature);
        }

        $description = ucfirst(strtolower($obs->textDescription));

        return [
            "conditions" => [
                "long" => $this->t->translate($description),
                "short" => $this->t->translate($description),
            ],
            // C to F.
            "feels_like" => $feelsLike,
            "humidity" => (int) round($obs->relativeHumidity->value ?? 0),
            "icon" => $this->getIcon($obs),
            // C to F.
            "temperature" => $this->getTemperatureScalar($obs->temperature),
            "timestamp" => [
                "formatted" => $timestamp->format("l g:i A T"),
                "utc" => (int) $timestamp->format("U"),
            ],
            "wind" => [
                // Kph to mph.
                "speed" =>
                    $obs->windSpeed->value == null
                        ? null
                        : (int) round($obs->windSpeed->value * 0.6213712),
                "direction" => $this->getDirectionOrdinal(
                    $obs->windDirection->value,
                ),
            ],
            "stationInfo" => [
                "name" => $observationStation->properties->name,
                "identifier" =>
                    $observationStation->properties->stationIdentifier,
                "lat" => $observationStation->geometry->coordinates[1],
                "lon" => $observationStation->geometry->coordinates[0],
                // M to Feet
                "elevation" => round(
                    $observationStation->properties->elevation->value * 3.28,
                    1,
                ),
            ],
        ];
    }

    public function getHourlyPrecipitation(
        $wfo,
        $x,
        $y,
        $now = false,
        $self = false,
    ) {
        date_default_timezone_set("America/New_York");

        if (!$self) {
            $self = $this;
        }

        if (!($now instanceof \DateTimeImmutable)) {
            $now = new \DateTimeImmutable();
        }

        date_default_timezone_set("America/New_York");

        $forecast = $this->dataLayer->getHourlyForecast($wfo, $x, $y);

        $place = $this->getPlaceFromGrid($wfo, $x, $y);
        $timezone = $place->timezone;

        $forecast = $forecast->periods;

        $periods = [];

        foreach ($forecast->quantitativePrecipitation->values as $quantPrecip) {
            $valid = $quantPrecip->validTime;
            $value = $quantPrecip->value;
            $value = $this->millimetersToInches($value);

            $valid = explode("/", $valid);
            $start = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $valid[0],
            )->setTimeZone(new \DateTimeZone($timezone));

            $duration = new \DateInterval($valid[1]);
            $end = $start->add($duration);

            if ($end >= $now) {
                $periods[] = (object) [
                    "start" => $start->format("g A"),
                    "end" => $end->format("g A"),
                    "value" => round($value, 1),
                ];
            }
        }

        return $periods;
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
    public function getDailyForecastFromGrid(
        $wfo,
        $x,
        $y,
        $now = false,
        $defaultDays = 5,
    ) {
        $forecast = $this->dataLayer->getDailyForecast($wfo, $x, $y);

        $periods = $forecast->periods;

        // In order to keep the time zones straight,
        // we set the "current" (now) time to be
        // the startTime of the first period.
        if (!($now instanceof \DateTimeImmutable)) {
            $now = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $periods[0]->startTime,
            );
        }

        // These are the periods that correspond to "today".
        // Usually they are 1 or two periods, depending on when
        // during the day the call is made to the API.
        // Examples of period names here include "Today"
        // "This Afternoon" "Tonight" "Overnight" etc
        $todayPeriods = $this->filterToToday($periods, $now);

        // Detailed periods are the periods for which
        // we want to show a detailed daily forecast.
        // Periods are either daytime or nighttime
        // periods, as told by the isDaytime property
        $detailedPeriods = $this->filterToFutureDays(
            $periods,
            $now,
            $defaultDays,
        );

        // The extended periods are all the periods
        // returned by the API that come after the
        // detailed periods.
        // In the UI, we will show less detailed
        // information for these periods
        $extendedPeriods = $this->filterToExtendedPeriods(
            $periods,
            $now,
            $defaultDays, // The number of detailed days to skip over
        );

        // Format each of the today periods
        // as assoc arrays that can be used
        // by the templates
        $todayPeriodsFormatted = array_map(function ($period) {
            return $this->formatDailyPeriod($period);
        }, $todayPeriods);

        // Format each of the detailed periods
        // as assoc arrays that can be used by
        // the templates. Also group the periods
        // into daytime and nighttime pairs
        $detailedPeriodsFormatted = array_map(function ($periodPair) {
            $day = $periodPair[0];
            $night = $periodPair[1];

            return [
                "daytime" => $this->formatDailyPeriod($day),
                "overnight" => $this->formatDailyPeriod($night),
            ];
        }, array_chunk($detailedPeriods, 2));

        // Format each of the extended periods as
        // assoc arrays that can be used by the
        // templates. Also group the periods
        // into daytime and nighttime pairs
        $extendedPeriodsFormatted = array_map(function ($periodPair) {
            $day = $periodPair[0];
            $night = $periodPair[1];

            return [
                "daytime" => $this->formatDailyPeriod($day),
                "overnight" => $this->formatDailyPeriod($night),
            ];
        }, array_chunk($extendedPeriods, 2));

        return [
            "today" => array_values($todayPeriodsFormatted),
            "detailed" => array_values($detailedPeriodsFormatted),
            "extended" => array_values($extendedPeriodsFormatted),
        ];
    }

    public function getPlaceNearPoint($lat, $lon)
    {
        return $this->dataLayer->getPlaceNearPoint($lat, $lon);
    }
}
