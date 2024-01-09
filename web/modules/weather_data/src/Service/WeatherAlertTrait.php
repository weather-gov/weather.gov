<?php

namespace Drupal\weather_data\Service;

/**
 * Add weather alert methods.
 */
trait WeatherAlertTrait
{
    protected static function fixupNewlines($str)
    {
        if ($str) {
            // Remove individual newline characters. Leave pairs. Pairs of
            // newlines are equivalent to paragraph breaks and we want to keep
            // those, but within a paragraph, we want to let the text break on
            // its own.
            return preg_replace("/([^\n])\n([^\n])/m", "$1 $2", $str);
        }
        return $str;
    }

    protected static function turnToDate($str, $timezone)
    {
        if ($str) {
            return \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $str,
                new \DateTimeZone($timezone),
            );
        }
        return $str;
    }

    /**
     * Get active alerts for a WFO grid cell.
     */
    public function getAlertsForGrid($wfo, $x, $y)
    {
        $geometry = $this->getGeometryFromGrid($wfo, $x, $y);
        $point = $geometry[0];

        return $this->getAlertsForLatLon($point->lat, $point->lon);
    }

    /**
     * Get active alerts for a latitude and longitude.
     */
    public function getAlertsForLatLon($lat, $lon)
    {
        $alerts = $this->getFromWeatherAPI(
            "https://api.weather.gov/alerts/active?status=actual&point=$lat,$lon",
        );

        $timezone = $this->getTimezoneForLatLon($lat, $lon);

        $alerts = array_map(function ($alert) use ($timezone) {
            $output = clone $alert->properties;

            if ($alert->geometry ?? false) {
                $output->geometry = $alert->geometry->coordinates[0];
            } else {
                $output->geometry = [];
            }

            $output->description = self::fixupNewlines(
                $output->description ?? false,
            );
            $output->instruction = self::fixupNewlines(
                $output->instruction ?? false,
            );
            $output->areaDesc = self::fixupNewlines($output->areaDesc ?? false);

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
        }, $alerts->features);

        return AlertPriority::sort($alerts);
    }
}
