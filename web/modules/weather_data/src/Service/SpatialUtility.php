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

    // For geographic projects, MySQL returns coordinates in lat/lon order
    // instead of the world standard lon/lat. This is especially frustrating
    // when they do it with the output of ST_ASGEOJSON, which explicitly
    // specifies the order should be x/y, not y/x (thus lon/lat, not lat/lon).
    // This function recursively works through an array of (an array of) points
    // to swap the values as necessary.
    //
    // Recursion is necessary because different GeoJSON geometry types will have
    // different levels of array depth. Points have one dimension, polygons have
    // two, multipolygons have three, etc. This is meant to be a general solve.
    public static function swapLatLon(array &$point)
    {
        $numbers = array_filter($point, "is_numeric");

        // If the incoming array only has two elements and they are numbers,
        // then we are ready to swap them.
        if (count($point) === 2 && count($numbers) === 2) {
            return [$point[1], $point[0]];
        } else {
            // If every element of the incoming array is itself an array, then
            // we're ready to recurse on those arrays.
            $arrays = array_filter($point, "is_array");
            if (count($point) === count($arrays)) {
                for ($i = 0; $i < count($point); $i += 1) {
                    $point[$i] = SpatialUtility::swapLatLon($point[$i]);
                }
                return $point;
            }
        }

        throw new \Exception(
            "Provided data is not a single point nor an array of arrays",
        );
    }
}
