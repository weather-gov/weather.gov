<?php

namespace Drupal\weather_data\Service;

/**
 * Add weather alert methods.
 */
trait WeatherAlertTrait
{
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

        $alerts = array_map(function ($alert) {
            $output = clone $alert->properties;

            if ($alert->geometry != null) {
                $output->geometry = $alert->geometry->coordinates[0];
            } else {
                $output->geometry = [];
            }

            $www = explode("\n\n", $alert->properties->description);

            $www = array_map(function ($line) {
                $parts = explode("...", $line);
                if (count($parts) > 1) {
                    $name = strtolower(substr($parts[0], 2));
                    return [
                        "name" => $name,
                        "value" => str_replace("\n", " ", $parts[1]),
                    ];
                }
                return ["name" => false];
            }, $www);

            $www = array_filter($www, function ($item) {
                $expected = ["what", "when", "where", "impacts"];
                return in_array($item["name"], $expected);
            });

            $output->description = explode(
                "\n\n",
                $alert->properties->description,
            );

            $output->whatWhereWhen = $www;

            return $output;
        }, $alerts->features);

        return $alerts;
    }
}
