<?php

namespace Drupal\weather_data\Service;

use Drupal\weather_data\Service\WeatherAlertParser;

/**
 * Add weather alert methods.
 */
trait AlertTrait
{
    /**
     * A cached version of any fetched alerts
     */
    private $stashedAlerts = null;

    public static function tryParsingDescriptionText($str)
    {
        $parser = new WeatherAlertParser($str);
        return $parser->parse();
    }

    /**
     * Get active alerts for a WFO grid cell.
     */
    public function getAlerts($grid, $point, $self = false, $now = false)
    {
        if ($this->stashedAlerts) {
            return $this->stashedAlerts;
        }
        if (!$self) {
            $self = $this;
        }
        if (!($now instanceof \DateTimeImmutable)) {
            $now = new \DateTimeImmutable();
        }

        $wfo = $grid->wfo;
        $x = $grid->x;
        $y = $grid->y;

        $geometry = $self->getGeometryFromGrid($wfo, $x, $y);
        $place = $this->dataLayer->getPlaceNearPoint($point->lat, $point->lon);
        $timezone = $place->timezone;

        $alerts = $this->dataLayer->getAlertsForState($place->state);

        $forecastZone = $this->dataLayer->getPoint($point->lat, $point->lon);
        $countyZone = $forecastZone->properties->county;
        $fireZone = $forecastZone->properties->fireWeatherZone;
        $forecastZone = $forecastZone->properties->forecastZone;

        $gridWKT = SpatialUtility::geometryObjectToWKT($geometry);

        $alerts = array_filter($alerts, function ($alert) use (
            $place,
            $gridWKT,
            $forecastZone,
            $countyZone,
            $fireZone,
        ) {
            if (AlertUtility::isMarineAlert($alert->properties->event)) {
                return false;
            }

            // If there's a geometry for this alert, use that to determine
            // whether it's relevant for our location.
            if ($alert->geometry) {
                $alertWKT = SpatialUtility::geometryArrayToWKT(
                    $alert->geometry->coordinates[0],
                );

                $sql = "SELECT ST_INTERSECTS(
                    $gridWKT,
                    $alertWKT
                ) as yes";

                $intersects = $this->dataLayer->databaseFetch($sql)->yes;

                return $intersects > 0;
            }

            // If there's no geometry, then we first need to check if there
            // are zones.
            if (sizeof($alert->properties->affectedZones) > 0) {
                $inForecastZone = in_array(
                    $forecastZone,
                    $alert->properties->affectedZones,
                );

                $inCountyZone = in_array(
                    $countyZone,
                    $alert->properties->affectedZones,
                );

                $inFireZone = in_array(
                    $fireZone,
                    $alert->properties->affectedZones,
                );

                return $inForecastZone || $inCountyZone || $inFireZone;
            }

            // If there are no zones, check if there are counties. Note that the
            // SAME property is not always present, so coalesce an empty list.
            if (sizeof($alert->properties->geocode->SAME ?? []) > 0) {
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

        $alerts = array_map(function ($alert) use ($timezone, $now) {
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
            $output->onset = DateTimeUtility::stringToDate(
                $output->onset ?? false,
                $timezone,
            );
            $output->endsRaw = $output->ends ?? null;
            $output->ends = DateTimeUtility::stringToDate(
                $output->ends ?? false,
                $timezone,
            );
            $output->expiresRaw = $output->expires ?? null;
            $output->expires = DateTimeUtility::stringToDate(
                $output->expires ?? false,
                $timezone,
            );

            $output->timezone = $timezone;

            $output->durationText = $this->t->translate(
                AlertUtility::getDurationText($output, $now),
            );

            return $output;
        }, $alerts);

        $alerts = AlertUtility::sort($alerts);

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
        if (count($alerts) === 0 || count($periods) === 0) {
            return [];
        }

        // Pull out alerts that are relevant to the range
        // of the current periods
        $firstPeriodStartTime = DateTimeUtility::stringToDate(
            $periods[0]["timestamp"],
        );

        $lastPeriodEndTime = DateTimeUtility::stringToDate(
            $periods[array_key_last($periods)]["timestamp"],
        );
        $lastPeriodEndTime = $lastPeriodEndTime->modify("+ 1 hour");

        // Filter out alerts that do not overlap our hourly forecast periods.
        $relevantAlerts = array_filter($alerts, function ($alert) use (
            &$periods,
            &$lastPeriodEndTime,
            &$firstPeriodStartTime,
        ) {
            $onsetDateTime = DateTimeUtility::stringToDate($alert->onsetRaw);
            $endsDateTime = AlertUtility::getEndTime($alert);
            return $onsetDateTime < $lastPeriodEndTime &&
                $endsDateTime > $firstPeriodStartTime;
        });

        // We will  respond with a list of alerts from the
        // incoming alerts that fall within the period range,
        // annotated with extra information about how
        // they should be displayed
        $alertPeriods = [];

        foreach ($relevantAlerts as $currentAlert) {
            $onsetTime = DateTimeUtility::stringToDate($currentAlert->onsetRaw);
            $endTime = AlertUtility::getEndTime($currentAlert);
            if (!$endTime) {
                continue; // pass to the next alert, ignoring this one
            }
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

        // Filter out any periods whose duration was
        // computed to zero. This can happen when
        // the diff between a period start and an old
        // alert end time is only in seconds (ie zero minutes
        // and zero days)
        return array_values(
            array_filter($alertPeriods, function ($alertPeriod) {
                return $alertPeriod["duration"] > 0;
            }),
        );
    }

    /**
     * Compute a DateInterval in hours
     *
     */
    private function dateDiffInHours(\DateInterval $diff)
    {
        $days = $diff->days * 24;
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
            $periodStartTime = DateTimeUtility::stringToDate(
                $period["timestamp"],
            );
            $periodEndTime = $periodStartTime->modify("+ 1 hour");

            $onsetIsWithinPeriod = $this->dateTimeIsWithin(
                $alertOnset,
                $periodStartTime,
                $periodEndTime,
            );

            if ($onsetIsWithinPeriod) {
                // Get the number of hours the alert is
                // supposed to last
                $alertDuration = $this->calculateAlertDuration(
                    $periodStartTime,
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
