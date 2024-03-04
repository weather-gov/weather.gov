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

        $date = \DateTimeImmutable::createFromFormat(
            \DateTimeInterface::ISO8601_EXPANDED,
            $time[0],
        );
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
            $now = new \DateTimeImmutable();
        }

        date_default_timezone_set("America/New_York");

        $place = $self->getPlaceFromGrid($wfo, $gridX, $gridY);
        $timezone = $place->timezone;

        $forecast = $this->getFromWeatherAPI("/gridpoints/$wfo/$gridX,$gridY")
            ->properties;

        $properties = [
            "dewpoint",
            "probabilityOfPrecipitation",
            "relativeHumidity",
            "temperature",
            "windDirection",
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
            $diff = $now->diff($period, false);

            return $diff->invert != 1;
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
                return array_merge(...$matches);
            }
            return false;
        }, $periods);

        $forecast = array_filter($forecast, function ($period) {
            return $period !== false;
        });

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

            // Leaving these comments in here for now. We're eventually going to
            // have to figure out what to do about getting the icon and
            // conditions text, since they're not in the /gridpoints endpoint.

            // $obsKey = $this->getApiObservationKey($period);

            return [
                // "conditions" => $this->t->translate(
                //     ucfirst(strtolower($period->shortForecast)),
                // ),
                // "icon" => $this->legacyMapping->$obsKey->icon,
                // "iconBasename" => $this->getIconFileBasename($obsKey),
                "dewpoint" => $this->getTemperatureScalar(
                    (object) [
                        "unitCode" => $units["dewpoint"],
                        "value" => $period["dewpoint"],
                    ],
                ),
                "probabilityOfPrecipitation" =>
                    $period["probabilityOfPrecipitation"],
                "relativeHumidity" => $period["relativeHumidity"],
                "time" => $timeString,
                "timestamp" => $period["timestamp"]->format("c"),
                "temperature" => $this->getTemperatureScalar(
                    (object) [
                        "unitCode" => $units["temperature"],
                        "value" => $period["temperature"],
                    ],
                ),
                "windDirection" => $this->getDirectionOrdinal(
                    $period["windDirection"],
                ),
                "windSpeed" => $this->getSpeedScalar(
                    (object) [
                        "unitCode" => $units["windSpeed"],
                        "value" => $period["windSpeed"],
                    ],
                ),
            ];
        }, $forecast);

        // Reindex the array. array_filter maintains indices, so it can result in
        // holes in the array. Bizarre behavior choice, but okay...
        return array_values($forecast);
    }
}
