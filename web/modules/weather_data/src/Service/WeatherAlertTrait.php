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
        $lastPeriodStartTime = \DateTimeImmutable::createFromFormat(
            \DateTimeInterface::ISO8601_EXPANDED,
            $periods[array_key_last($periods)]["timestamp"],
        );
        $relevantAlerts = array_filter($alerts, function ($alert) use (
            &$periods,
            &$lastPeriodStartTime,
        ) {
            $onsetDateTime = self::turnToDate(
                $alert->onsetRaw,
                $alert->timezone,
            );
            return $onsetDateTime < $lastPeriodStartTime;
        });

        $alertPeriods = [];
        foreach ($periods as $periodIndex => $period) {
            $currentAlert = array_shift($relevantAlerts);
            while ($currentAlert) {
                $periodStartTime = \DateTimeImmutable::createFromFormat(
                    \DateTimeInterface::ISO8601_EXPANDED,
                    $period["timestamp"],
                );
                $onsetTime = self::turnToDate(
                    $currentAlert->onsetRaw,
                    $currentAlert->timezone,
                );
                $endTime = self::turnToDate(
                    $currentAlert->endsRaw,
                    $currentAlert->timezone,
                );

                if (
                    $onsetTime <= $periodStartTime &&
                    $endTime > $periodStartTime
                ) {
                    // Get the number of hours the alert is
                    // supposed to last
                    $alertDiff = $endTime->diff($onsetTime, true);
                    $alertDuration = $alertDiff->h;
                    if ($alertDiff->m) {
                        $alertDuration += 1;
                    }

                    // If the duration plus the current index
                    // is greater than the count of the periods,
                    // trim duration to end at the period length
                    $alertDuration = min(
                        count($periods) - $periodIndex - 1,
                        $alertDuration,
                    );

                    array_push($alertPeriods, [
                        "duration" => $alertDuration,
                        "periodIndex" => $periodIndex,
                        "alert" => $currentAlert,
                    ]);
                }

                $currentAlert = array_shift($relevantAlerts);
            }
        }

        return $alertPeriods;
    }
}
