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
    public function getAlertsForGrid($wfo, $x, $y, $self = false)
    {
        if (!$self) {
            $self = $this;
        }

        $CACHE_KEY = "alerts $wfo/$x/$y";
        $cache = $this->cache->get($CACHE_KEY);
        if ($cache) {
            return $cache->data;
        }

        $geometry = $self->getGeometryFromGrid($wfo, $x, $y);
        $place = $self->getPlaceFromGrid($wfo, $x, $y);
        $timezone = $place->timezone;

        $alerts = $self->getFromWeatherAPI(
            "/alerts/active?status=actual&area=$place->state",
        )->features;

        $point = $geometry[0];
        $zone = $self->getFromWeatherAPI("/points/$point->lat,$point->lon");
        $zone = $zone->properties->forecastZone;

        $geometry = array_map(function ($point) {
            return $point->lon . " " . $point->lat;
        }, $geometry);
        $geometry = implode(",", $geometry);

        $alerts = array_filter($alerts, function ($alert) use (
            $place,
            $geometry,
            $zone,
        ) {
            if (AlertPriority::isMarineAlert($alert->properties->event)) {
                return false;
            }

            // If there's a geometry for this alert, use that to determine
            // whether it's relevant for our location.
            if ($alert->geometry) {
                $alertGeometry = array_map(function ($point) {
                    return $point[0] . " " . $point[1];
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
                return in_array(
                    // SAME codes are FIPS codes with a leading 0
                    $zone,
                    $alert->properties->affectedZones,
                );
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

            $output->onset = self::turnToDate(
                $output->onset ?? false,
                $timezone,
            );
            $output->ends = self::turnToDate($output->ends ?? false, $timezone);
            $output->expires = self::turnToDate(
                $output->expires ?? false,
                $timezone,
            );

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

        return $alerts;
    }
}
