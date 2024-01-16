<?php

namespace Drupal\weather_data\Service;

trait TimezoneTrait
{
    public function getTimezoneForGrid($wfo, $x, $y)
    {
        $geometry = $this->getGeometryFromGrid($wfo, $x, $y);
        $point = $geometry[0];

        return $this->getTimezoneForLatLon($point->lat, $point->lon);
    }

    public function getTimezoneForLatLon($lat, $lon)
    {
        $timezone = $this->getFromWeatherAPI("/points/$lat,$lon");
        $timezone = $timezone->properties->timeZone;

        return $timezone;
    }
}
