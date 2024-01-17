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
            $datestamp = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $str,
            );
            $datestamp = $datestamp->setTimeZone(new \DateTimeZone($timezone));

            return $datestamp;
        }
        return $str;
    }

    static function tryParsingDescriptionText($str)
    {
        $regex = "/\*\s+(?<label>[A-Za-z\s]+)\.\.\.(?<content>.*)(\n{2}|$)/sU";
        if (preg_match_all($regex, $str, $matches)) {
            $result = [];
            for ($i = 0; $i < count($matches["label"]); $i++) {
                $label = strtolower($matches["label"][$i]);
                $content = $matches["content"][$i];
                $result[$label] = $content;
            }

            return $result;
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
        $lat = round($lat, 4);
        $lon = round($lon, 4);

        $alerts = $this->getFromWeatherAPI(
            "/alerts/active?status=actual&point=$lat,$lon",
        );

        $timezone = $this->getTimezoneForLatLon($lat, $lon);

        $alerts = array_map(function ($alert) use ($timezone) {
            $output = clone $alert->properties;

            if ($alert->geometry ?? false) {
                $output->geometry = $alert->geometry->coordinates[0];
            } else {
                $output->geometry = [];
            }

            $alertDescription = self::tryParsingDescriptionText(
                $output->description,
            );
            if (!is_array($alertDescription)) {
                $output->description = self::fixupNewlines(
                    $alertDescription ?? false,
                );
                $output->usesParsedDescription = false;
            } else {
                $output->description = $alertDescription;
                $output->usesParsedDescription = true;
            }

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

        $alerts = AlertPriority::removeMarineAlerts($alerts);
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

        return $alerts;
    }
}
