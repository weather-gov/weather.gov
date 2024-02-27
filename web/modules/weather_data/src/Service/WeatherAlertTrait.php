<?php

namespace Drupal\weather_data\Service;

use Drupal\weather_data\Service\WeatherAlertParser;

/**
 * Add weather alert methods.
 */
trait WeatherAlertTrait
{
    protected static function turnToDate($str, $timezone)
    {
        if ($str) {
            $datestamp = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $str,
            );
            $datestamp = $datestamp->setTimeZone(new \DateTimeZone($timezone));

            return $datestamp;
        }
        return $str;
    }

    public static function tryParsingDescriptionText($str)
    {
        $parser = new WeatherAlertParser($str);
        return $parser->parse();
    }

    /**
     * Get active alerts for a WFO grid cell.
     */
    public function getAlerts($grid, $point, $self = false)
    {
        if ($this->stashedAlerts) {
            return $this->stashedAlerts;
        }
        if (!$self) {
            $self = $this;
        }

        $wfo = $grid->wfo;
        $x = $grid->x;
        $y = $grid->y;

        $CACHE_KEY = "alerts $wfo/$x/$y";
        $cache = $this->cache->get($CACHE_KEY);
        if ($cache) {
            return $cache->data;
        }

        $geometry = $self->getGeometryFromGrid($wfo, $x, $y);
        $place = $self->getPlaceNear($point->lat, $point->lon);
        $timezone = $place->timezone;

        $alerts = $self->getFromWeatherAPI(
            "/alerts/active?status=actual&area=$place->state",
        )->features;

        $forecastZone = $self->getFromWeatherAPI(
            "/points/$point->lat,$point->lon",
        );
        $fireZone = $forecastZone->properties->fireWeatherZone;
        $forecastZone = $forecastZone->properties->forecastZone;

        $geometry = array_map(function ($point) {
            return $point->lon . " " . $point->lat;
        }, $geometry);
        $geometry = implode(",", $geometry);

        $alerts = array_filter($alerts, function ($alert) use (
            $place,
            $geometry,
            $forecastZone,
            $fireZone,
        ) {
            if (AlertPriority::isMarineAlert($alert->properties->event)) {
                return false;
            }

            // If there's a geometry for this alert, use that to determine
            // whether it's relevant for our location.
            if ($alert->geometry) {
                $alertGeometry = array_map(function ($alertGeomPoint) {
                    return $alertGeomPoint[0] . " " . $alertGeomPoint[1];
                }, $alert->geometry->coordinates[0]);
                $alertGeometry = implode(",", $alertGeometry);

                $sql = "SELECT ST_INTERSECTS(
                    ST_POLYGONFROMTEXT(
                        'POLYGON(($geometry))'
                    ),
                    ST_POLYGONFROMTEXT(
                        'POLYGON(($alertGeometry))'
                    )
                ) as yes";

                $intersects = $this->database->query($sql)->fetch()->yes;

                return $intersects > 0;
            }

            // If there's no geometry, then we first need to check if there
            // are zones.
            if (sizeof($alert->properties->affectedZones) > 0) {
                $inForecastZone = in_array(
                    $forecastZone,
                    $alert->properties->affectedZones,
                );

                $inFireZone = in_array(
                    $fireZone,
                    $alert->properties->affectedZones,
                );

                return $inForecastZone || $inFireZone;
            }

            // If there are no zones, check if there are counties.
            if (sizeof($alert->properties->geocode->SAME) > 0) {
                return in_array(
                    // SAME codes are FIPS codes with a leading 0
                    "0$place->countyFIPS",
                    $alert->properties->geocode->SAME,
                );
            }

            // If there's no geometry, zone, or county information, then we
            // just... skip this one. But we should totally log this
            // situation because something is wrong.
            return false;
        });

        $alerts = array_map(function ($alert) use ($timezone) {
            $output = clone $alert->properties;

            if ($alert->geometry ?? false) {
                $output->geometry = $alert->geometry->coordinates[0];
            } else {
                $output->geometry = [];
            }

            $output->description = self::tryParsingDescriptionText(
                $output->description,
            );

            $output->instruction = WeatherAlertParser::fixupNewlines(
                $output->instruction ?? false,
            );

            $output->areaDesc = WeatherAlertParser::fixupNewlines(
                $output->areaDesc ?? false,
            );
            if ($output->areaDesc) {
                $output->areaDesc = array_map(function ($description) {
                    return trim($description);
                }, explode(";", $output->areaDesc));
            }

            $output->onsetRaw = $output->onset;
            $output->onset = self::turnToDate(
                $output->onset ?? false,
                $timezone,
            );
            $output->endsRaw = $output->ends ?? null;
            $output->ends = self::turnToDate($output->ends ?? false, $timezone);
            $output->expiresRaw = $output->expires ?? null;
            $output->expires = self::turnToDate(
                $output->expires ?? false,
                $timezone,
            );

            $output->timezone = $timezone;

            return $output;
        }, $alerts);

        $alerts = AlertPriority::sort($alerts);

        // For some reason, Twig is unreliable in how it formats the dates.
        // Sometimes they are done in the timezone-local time, other times it
        // reverts to UTC. However, when we do it here, it's consistently
        // correct. So... while it'd be nice to put the formatting logic in
        // Twig, that's just not reliable enough.
        foreach ($alerts as $alert) {
            if ($alert->onset) {
                $alert->onset = $alert->onset->format("l, m/d, g:i A T");
            }
            if ($alert->ends) {
                $alert->ends = $alert->ends->format("l, m/d, g:i A T");
            }
            if ($alert->expires) {
                $alert->expires = $alert->expires->format("l, m/d, g:i A T");
            }
        }

        $this->cache->set($CACHE_KEY, $alerts, time() + 30);

        $this->stashedAlerts = $alerts;

        return $alerts;
    }

    /**
     * Align alerts to hourly periods for display purposes
     *
     * The alerts need to be displayed in the hourly table,
     * often across multiple hourly columns. We use this
     * method to process the alert information for display
     * within those columns.
     */
    public function alertsToHourlyPeriods($alerts, $periods)
    {
        // Pull out alerts that are relevant to the range
        // of the current periods
        $firstPeriodStartTime = \DateTimeImmutable::createFromFormat(
            \DateTimeInterface::ISO8601_EXPANDED,
            $periods[0]["timestamp"],
        );
        $lastPeriodEndTime = \DateTimeImmutable::createFromFormat(
            \DateTimeInterface::ISO8601_EXPANDED,
            $periods[array_key_last($periods)]["timestamp"],
        );
        $lastPeriodEndTime = $lastPeriodEndTime->modify("+ 1 hour");

        // Initially weed out any alerts that to not fall
        // within the overall period range
        $relevantAlerts = array_filter($alerts, function ($alert) use (
            &$periods,
            &$lastPeriodEndTime,
        ) {
            $onsetDateTime = self::turnToDate(
                $alert->onsetRaw,
                $alert->timezone,
            );
            return $onsetDateTime < $lastPeriodEndTime;
        });

        // We will  respond with a list of alerts from the
        // incoming alerts that fall within the period range,
        // annotated with extra information about how
        // they should be displayed
        $alertPeriods = [];

        foreach ($relevantAlerts as $currentAlert) {
            $onsetTime = self::turnToDate(
                $currentAlert->onsetRaw,
                $currentAlert->timezone,
            );
            $endTime = self::turnToDate(
                $currentAlert->endsRaw,
                $currentAlert->timezone,
            );
            $alertEncompassesPeriods = $this->dateTimeEncompasses(
                $onsetTime,
                $endTime,
                $firstPeriodStartTime,
                $lastPeriodEndTime,
            );
            $alertStartsInPeriodRange = $this->dateTimeIsWithin(
                $onsetTime,
                $firstPeriodStartTime,
                $lastPeriodEndTime,
            );
            $alertEndsInPeriodRange = $this->dateTimeIsWithin(
                $endTime,
                $firstPeriodStartTime,
                $lastPeriodEndTime,
            );

            if ($alertEncompassesPeriods) {
                // If the current alert fully encompasses the
                // duration of the period range, we know the
                // index and duration already
                array_push($alertPeriods, [
                    "periodIndex" => 0,
                    "duration" => count($periods),
                    "alert" => $currentAlert,
                ]);
            } elseif (!$alertStartsInPeriodRange && $alertEndsInPeriodRange) {
                // If the alert does not start within the overall period range,
                // but ends within it, the alert must precede these periods
                array_push($alertPeriods, [
                    "periodIndex" => 0,
                    "duration" => $this->calculateAlertDuration(
                        $firstPeriodStartTime,
                        $endTime,
                        count($periods),
                    ),
                    "alert" => $currentAlert,
                ]);
            } else {
                // Otherwise, we need to cycle through the periods and see
                // if the times align at all, either at the start or the end.
                $alertInfo = $this->getAlertInfoInPeriods(
                    $currentAlert,
                    $onsetTime,
                    $endTime,
                    $periods,
                );
                if ($alertInfo) {
                    array_push($alertPeriods, $alertInfo);
                }
            }
        }

        return $alertPeriods;
    }

    /**
     * Compute a DateInterval in hours
     *
     * For now, we do not take months or
     * years into account in the diff.
     */
    private function dateDiffInHours(\DateInterval $diff)
    {
        $days = $diff->d * 24;
        return $diff->h + $days;
    }

    /**
     * Determine whether a given DateTime is within two others
     */
    private function dateTimeIsWithin($subject, $beginning, $end)
    {
        return $beginning <= $subject && $subject < $end;
    }

    /**
     * Determine if a subject beginning and end datetime
     * encompasses (both starts before and ends after)
     * a comparison beginning and end datetime
     */
    private function dateTimeEncompasses(
        $subjectStart,
        $subjectEnd,
        $comparisonStart,
        $comparisonEnd,
    ) {
        return $subjectStart <= $comparisonStart &&
            $subjectEnd >= $comparisonEnd;
    }

    /**
     * Compute the duration of the alert
     *
     * The duration is a function of the DateTime
     * diff, but adjusted for the overall period
     * range.
     * Note that DateInterval is "special"
     * about how it computes diffs
     */
    private function calculateAlertDuration($onsetTime, $endTime, $max)
    {
        $alertDiff = $endTime->diff($onsetTime, true);
        $alertDuration = $this->dateDiffInHours($alertDiff);

        // If there are leftover minutes, we add
        // an hour for coverage purposes
        if ($alertDiff->m) {
            $alertDuration += 1;
        }

        return min($max, $alertDuration);
    }

    /**
     * Find relevant alert info in a list of hourly periods
     *
     * Given a list of hourly forecast periods and an alert,
     * attempt to find alert alignment info within any of
     * those periods.
     * Return false if nothing is found
     */
    private function getAlertInfoInPeriods(
        $alert,
        $alertOnset,
        $alertEnd,
        $periods,
    ) {
        foreach ($periods as $periodIndex => $period) {
            $periodStartTime = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $period["timestamp"],
            );
            $periodEndTime = $periodStartTime->modify("+ 1 hour");

            $onsetIsWithinPeriod = $this->dateTimeIsWithin(
                $alertOnset,
                $periodStartTime,
                $periodEndTime,
            );
            $endIsWithinPeriod = $this->dateTimeIsWithin(
                $alertEnd,
                $periodStartTime,
                $periodEndTime,
            );

            if ($onsetIsWithinPeriod) {
                // Get the number of hours the alert is
                // supposed to last
                $alertDuration = $this->calculateAlertDuration(
                    $alertOnset,
                    $alertEnd,
                    count($periods) - $periodIndex,
                );

                return [
                    "duration" => $alertDuration,
                    "periodIndex" => $periodIndex,
                    "alert" => $alert,
                ];
            }
        }

        return false;
    }
}
