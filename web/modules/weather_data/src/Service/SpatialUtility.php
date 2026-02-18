<?php

namespace Drupal\weather_data\Service;

class SpatialUtility
{
    /**
     * Force a coordinate value through floatval() so it can never carry
     * SQL payload. Coordinates flow in from the NWS API and end up
     * interpolated into WKT strings like POINT(lon lat) — if one of
     * those values were ever a crafted string instead of a number,
     * it could break out of the WKT context and inject SQL. Casting
     * through floatval() destroys anything that isn't numeric.
     */
    private static function safeFloat($value): float
    {
        $result = floatval($value);
        if (!is_finite($result)) {
            throw new \Exception(
                "Invalid coordinate value: non-finite number"
            );
        }
        return $result;
    }

    public static function pointArrayToObject($point)
    {
        return (object) [
            "lat" => self::safeFloat($point[1]),
            "lon" => self::safeFloat($point[0]),
        ];
    }

    public static function pointObjectToWKT($point)
    {
        // Run both through safeFloat before they hit the WKT string.
        $lon = self::safeFloat($point->lon);
        $lat = self::safeFloat($point->lat);
        return "ST_GEOMFROMTEXT('POINT($lon $lat)')";
    }

    public static function pointArrayToWKT($point)
    {
        // Same idea, array form.
        $x = self::safeFloat($point[0]);
        $y = self::safeFloat($point[1]);
        return "ST_GEOMFROMTEXT('POINT($x $y)')";
    }

    public static function geometryArrayToObject($points)
    {
        return array_map(function ($point) {
            return self::pointArrayToObject($point);
        }, $points);
    }

    public static function geometryObjectToWKT($geometry)
    {
        // Polygons can have hundreds of vertices; each one gets
        // concatenated into the WKT string, so every pair needs
        // the safeFloat treatment.
        $wkt = array_map(function ($point) {
            $lon = self::safeFloat($point->lon);
            $lat = self::safeFloat($point->lat);
            return "$lon $lat";
        }, $geometry);
        $wkt = implode(",", $wkt);

        return "ST_GEOMFROMTEXT('POLYGON(($wkt))')";
    }

    public static function geoJSONtoSQL($geoJSON)
    {
        // The switch below handles the three geometry types we actually
        // encounter; anything else falls through to the exception.
        $type = strtoupper($geoJSON->type);
        $points = false;

        switch ($type) {
            case "POINT":
                $points = $geoJSON->coordinates;

                // Sanitize before splicing into the WKT literal.
                $x = self::safeFloat($points[0]);
                $y = self::safeFloat($points[1]);
                return "ST_GEOMFROMTEXT('POINT($x $y)')";

            case "POLYGON":
                $points = $geoJSON->coordinates[0];

                // Each vertex needs sanitization.
                $points = array_map(function ($point) {
                    $x = self::safeFloat($point[0]);
                    $y = self::safeFloat($point[1]);
                    return "$x $y";
                }, $points);
                $wkt = implode(",", $points);

                return "ST_GEOMFROMTEXT('POLYGON(($wkt))')";

            case "MULTIPOLYGON":
                $points = array_map(function ($polygon) {
                    return $polygon[0];
                }, $geoJSON->coordinates);

                // Multipolygons have an extra nesting level; still need to
                // sanitize every single coordinate pair.
                $polygons = array_map(function ($polygon) {
                    $points = array_map(function ($point) {
                        $x = self::safeFloat($point[0]);
                        $y = self::safeFloat($point[1]);
                        return "$x $y";
                    }, $polygon);
                    $wkt = implode(",", $points);

                    return "(($wkt))";
                }, $points);
                $wkt = implode(",", $polygons);

                return "ST_GEOMFROMTEXT('MULTIPOLYGON(" . $wkt . ")')";

            default:
                throw new \Exception("Unsupported GeoJSON type: " . $type);
        }
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
