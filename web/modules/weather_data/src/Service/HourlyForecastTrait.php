<?php

namespace Drupal\weather_data\Service;

trait HourlyForecastTrait
{
    protected function getDatePeriod($timeDurationString)
    {
        // API duration strings are ISO8601 format, but naturally PHP doesn't
        // understand how to parse date+time+duration all in one. So, we'll do
        // it ourselves.

        // Split into datetime and duration strings
        $time = explode("/", $timeDurationString);

        $date = DateTimeUtility::stringToDate($time[0]);
        $interval = new \DateInterval($time[1]);

        // Create an hourly date period. This will result in an iterable for
        // each hour covered by the input time string.
        return new \DatePeriod(
            $date,
            \DateInterval::createFromDateString("1 hour"),
            $date->add($interval),
        );
    }

    protected function getForecastPropertyAsHourlyPeriods($all, $propertyName)
    {
        $periods = [];
        $property = $all->$propertyName;

        foreach ($property->values as $value) {
            // Get an hourly date period from the valid time for this entry.
            $period = $this->getDatePeriod($value->validTime);

            // And iterate over all the hours.
            foreach ($period as $hour) {
                // And smoosh the hour into a single array representing all of
                // the hours covered for this property.
                $periods[] = [
                    $propertyName => $value->value,

                    // Set to the start of the hour.
                    "timestamp" => $hour->setTime(
                        (int) $hour->format("H"),
                        0,
                        0,
                        0,
                    ),
                ];
            }
        }

        return $periods;
    }

    public function filterHoursToSingleDay($hours)
    {
        $times = array_column($hours, "time");
        $firstTime = explode(" ", $times[0]);

        $first6am = array_search("6 AM", $times);
        if ($first6am === 0) {
            $first6am = array_search("6 AM", array_slice($times, 1));
        }

        if ($firstTime[1] === "AM" && intval($firstTime[0]) < 6) {
            $second6am = array_slice($times, $first6am + 1);
            $second6am = array_search("6 AM", $second6am);

            // + 2 to account for the 6 AM values themselves. Otherwise
            // we'll slice them out, because slice is not inclusive.
            $day = array_slice($hours, 0, $first6am + $second6am + 2);
        } else {
            // + 1 to account for the single 6 AM value. Slice is an
            // exclusive range operator.
            $day = array_slice($hours, 0, $first6am + 1);
        }

        return $day;
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
    public function getHourlyForecastFromGrid(
        $wfo,
        $gridX,
        $gridY,
        $now = false,
        $self = false,
    ) {
        if (!$self) {
            $self = $this;
        }

        $wfo = strtoupper($wfo);
        if (!($now instanceof \DateTimeImmutable)) {
            $now = DateTimeUtility::now();
        }

        date_default_timezone_set("America/New_York");

        $place = $self->getPlaceFromGrid($wfo, $gridX, $gridY);
        $timezone = $place->timezone;

        $forecast = $this->dataLayer->getGridpoint($wfo, $gridX, $gridY)
            ->properties;

        $extraForecast = $this->dataLayer->getHourlyForecast(
            $wfo,
            $gridX,
            $gridY,
        )->periods;

        $properties = [
            "apparentTemperature",
            "dewpoint",
            "probabilityOfPrecipitation",
            "relativeHumidity",
            "temperature",
            "windDirection",
            "windGust",
            "windSpeed",
        ];

        $units = array_map(function ($property) use ($forecast) {
            return [$property => $forecast->$property->uom];
        }, $properties);
        $units = array_merge(...$units);

        // Turn each of our properties into an array where each element in the
        // array covers a single hour rather than a span of multiple hours.
        $properties = array_map(function ($property) use ($forecast) {
            return $this->getForecastPropertyAsHourlyPeriods(
                $forecast,
                $property,
            );
        }, $properties);

        // Pull out all the single-hour time periods we found across all
        // properties.
        $getTimestamp = function ($period) {
            return $period["timestamp"];
        };
        $periods = array_map(function ($property) use ($getTimestamp) {
            return array_map($getTimestamp, $property);
        }, $properties);

        // Smoosh all the timestamps into a single array, and then keep only
        // the unique ones. This gives us a complete list of all the single-hour
        // periods covered by the API response.
        $periods = array_unique(array_merge(...$periods), \SORT_REGULAR);

        // Toss out any time periods in the past.
        $periods = array_filter($periods, function ($period) use (&$now) {
            return $period > $now;
        });

        // Now combine all the periods for each property into a single long list
        // of periods, each containing the timestamp and ALL of the property
        // values in a single object.
        $forecast = array_map(function ($period) use ($properties) {
            $matches = array_map(function ($property) use ($period) {
                $index = array_search(
                    $period,
                    array_column($property, "timestamp"),
                );
                if ($index !== false) {
                    return $property[$index];
                }
                return false;
            }, $properties);

            $matches = array_filter($matches, function ($match) {
                return $match !== false;
            });

            if (count($matches) == count($properties)) {
                $period = array_merge(...$matches);
                $period["shortForecast"] = "";
                $period["icon"] = null;
                return $period;
            }
            return false;
        }, $periods);

        $forecast = array_filter($forecast, function ($period) {
            return $period !== false;
        });

        // Reindex the array. array_filter maintains indices, so it can result in
        // holes in the array. Bizarre behavior choice, but okay...
        $forecast = array_values($forecast);

        // And then smoosh in the stuff we can only get from the
        // /forecast/hourly endpoint.
        $timestamps = array_column($forecast, "timestamp");
        foreach ($extraForecast as $period) {
            $start = DateTimeUtility::stringToDate($period->startTime);
            $start = $start->setTime((int) $start->format("H"), 0, 0, 0);

            $index = array_search($start, $timestamps);
            if ($index !== false) {
                $forecast[$index]["shortForecast"] = $period->shortForecast;
                $forecast[$index]["icon"] = $period->icon;
            }
        }

        // // Now map all those forecast periods into the structure we want.
        $forecast = array_map(function ($period) use (&$timezone, $units) {
            // This closure needs access to the $timezone variable about. The easiest
            // way I found to do it was using it by reference.
            // From the start period of the time, parse it as an ISO8601 string and
            // then format it into just the "Hour AM/PM" format (e.g., "8 PM")
            $timestamp = $period["timestamp"]->setTimeZone(
                new \DateTimeZone($timezone),
            );
            $timeString = $timestamp->format("g A");

            $apparentTemperature = UnitConversion::getTemperatureScalar(
                (object) [
                    "unitCode" => $units["apparentTemperature"],
                    "value" => $period["apparentTemperature"],
                ],
            );

            $temperature = UnitConversion::getTemperatureScalar(
                (object) [
                    "unitCode" => $units["temperature"],
                    "value" => $period["temperature"],
                ],
            );

            $windSpeed = UnitConversion::getSpeedScalar(
                (object) [
                    "unitCode" => $units["windSpeed"],
                    "value" => $period["windSpeed"],
                ],
            );
            $windGust = UnitConversion::getSpeedScalar(
                (object) [
                    "unitCode" => $units["windGust"],
                    "value" => $period["windGust"],
                ],
            );

            return [
                "apparentTemperature" =>
                    abs($apparentTemperature - $temperature) >= 0
                        ? $apparentTemperature
                        : null,
                "conditions" => $this->t->translate(
                    ucfirst(strtolower($period["shortForecast"])),
                ),
                "icon" => $this->getIcon((object) $period),
                "dewpoint" => UnitConversion::getTemperatureScalar(
                    (object) [
                        "unitCode" => $units["dewpoint"],
                        "value" => $period["dewpoint"],
                    ],
                ),
                "probabilityOfPrecipitation" =>
                    $period["probabilityOfPrecipitation"],
                "relativeHumidity" => $period["relativeHumidity"],
                "time" => $timeString,
                "timestamp" => $timestamp->format("c"),
                "temperature" => $temperature,
                "windDirection" => UnitConversion::getDirectionOrdinal(
                    $period["windDirection"],
                ),
                "windGust" =>
                    abs($windGust - $windSpeed) >= 8 ? $windGust : null,
                "windSpeed" => $windSpeed,
            ];
        }, $forecast);

        return $forecast;
    }

    public function filterHourlyPrecipitationToDay(
        \DateTimeImmutable $day,
        $precipitationPeriods,
        $timezone,
    ) {
        // Our NWS day starts after 6am of the "now" day
        $dayStart = $day->setTime(6, 0);
        // Our day ends at 6am of the day after the "now" day
        $dayEnd = $day->modify("+ 1 day")->setTime(6, 0);

        $periods = [];

        foreach ($precipitationPeriods as $quantPrecip) {
            $valid = $quantPrecip->validTime;
            $value = $quantPrecip->value;
            $value = UnitConversion::millimetersToInches($value);

            $valid = explode("/", $valid);
            $start = DateTimeUtility::stringToDate($valid[0], $timezone);

            $duration = new \DateInterval($valid[1]);
            $end = $start->add($duration);

            // Because we only have accumulated precip totals
            // for the duration period, we can't cut off the end of that period.
            // Therefore we only care about when the period starts.
            // If it starts within the $dayStart and $dayEnd window, it
            // counts for the current day.
            $precipPeriodIsToday = $start >= $dayStart && $start < $dayEnd;

            if ($precipPeriodIsToday) {
                $periods[] = (object) [
                    "start" => $start->format("g A"),
                    "startRaw" => $start->format("c"),
                    "end" => $end->format("g A"),
                    "value" => round($value, 2),
                    "endRaw" => $end->format("c"),
                ];
            }
        }

        return $periods;
    }

    public function getHourlyPrecipitation(
        $wfo,
        $x,
        $y,
        $now = false,
        $self = false,
    ) {
        if (!$self) {
            $self = $this;
        }

        if (!($now instanceof \DateTimeImmutable)) {
            $now = DateTimeUtility::now();
        }

        date_default_timezone_set("America/New_York");

        $forecast = $this->dataLayer->getGridpoint($wfo, $x, $y)->properties;

        $place = $this->getPlaceFromGrid($wfo, $x, $y);
        $timezone = $place->timezone;

        $periods = [];

        return $forecast->quantitativePrecipitation->values;
    }
}
