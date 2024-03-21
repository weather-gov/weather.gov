<?php

namespace Drupal\weather_data\Service;

class SpatialUtility
{
    public static function pointArrayToObject($point)
    {
        return (object) [
            "lat" => floatval($point[1]),
            "lon" => floatval($point[0]),
        ];
    }

    public static function pointObjectToWKT($point)
    {
        return "ST_GEOMFROMTEXT('POINT($point->lon $point->lat)')";
    }

    public static function pointArrayToWKT($point)
    {
        return "ST_GEOMFROMTEXT('POINT($point[0] $point[1])')";
    }

    public static function geometryArrayToObject($points)
    {
        return array_map(function ($point) {
            return self::pointArrayToObject($point);
        }, $points);
    }

    public static function geometryObjectToWKT($geometry)
    {
        $wkt = array_map(function ($point) {
            return $point->lon . " " . $point->lat;
        }, $geometry);
        $wkt = implode(",", $wkt);

        return "ST_GEOMFROMTEXT('POLYGON(($wkt))')";
    }

    public static function geometryArrayToWKT($geometry)
    {
        return self::geometryObjectToWKT(
            self::geometryArrayToObject($geometry),
        );
    }
}
