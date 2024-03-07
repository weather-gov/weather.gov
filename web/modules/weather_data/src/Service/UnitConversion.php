<?php

namespace Drupal\weather_data\Service;

/**
 * A service class for fetching weather data.
 */
class UnitConversion
{
    public static function millimetersToInches($mm)
    {
        // 1 mm = 0.03937008 inches
        return $mm * 0.03937008;
    }

    public static function getDirectionOrdinal($angle, $reverse = false)
    {
        // The cardinal and ordinal directions. North goes in twice because it
        // sits in two "segments": -22.5° to 22.5°, and 337.5° to 382.5°.
        $directions = [
            "north",
            "northeast",
            "east",
            "southeast",
            "south",
            "southwest",
            "west",
            "northwest",
            "north",
        ];
        $shortDirections = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];

        // 1. Whatever degrees we got from the API, constrain it to 0°-360°.
        // 2. Add 22.5° to it. This accounts for north starting at -22.5°
        // 3. Use integer division by 45° to see which direction index this is.
        // This indexes into the two direction name arrays above.
        $directionIndex = intdiv(intval(($angle % 360) + 22.5, 10), 45);

        return (object) [
            "long" => $directions[$directionIndex],
            "short" => $shortDirections[$directionIndex],
            "angle" => $angle,
        ];
    }

    public static function getLengthScalar(
        \stdClass $length,
        bool $inFeet = true,
    ) {
        $rawValue = $length->value;

        if ($rawValue == null) {
            return null;
        }

        $isMeters = $speed->unitCode == "wmoUnit:m";

        $out = null;
        if ($isMeters) {
            if ($inFeet) {
                $out = $rawValue * 3.28;
            } else {
                $out = $rawValue;
            }
        } else {
            if ($inFeet) {
                $out = $rawValue;
            } else {
                $out = $rawValue / 3.28;
            }
        }

        return (int) round($out);
    }

    public static function getSpeedScalar(\stdClass $speed, bool $inMph = true)
    {
        $rawValue = $speed->value;

        if ($rawValue == null) {
            return null;
        }

        $isKmh = $speed->unitCode == "wmoUnit:km_h-1";

        $out = null;
        if ($isKmh) {
            if ($inMph) {
                $out = $rawValue * 0.6213712;
            } else {
                $out = $rawValue;
            }
        } else {
            if ($inMph) {
                $out = $rawValue;
            } else {
                $out = $rawValue / 0.6213712;
            }
        }

        return (int) round($out);
    }

    /**
     * Get a temperature scalar from a wmoUnit temperature object.
     */
    public static function getTemperatureScalar(
        \stdClass $temperature,
        bool $inFahrenheit = true,
    ) {
        $rawValue = $temperature->value;

        if ($rawValue == null) {
            return null;
        }

        $isFahrenheit = $temperature->unitCode == "wmoUnit:degF";

        $out = null;
        if ($isFahrenheit) {
            if ($inFahrenheit) {
                $out = $rawValue;
            } else {
                $out = (($rawValue - 32) * 5) / 9;
            }
        } else {
            if ($inFahrenheit) {
                $out = ($rawValue * 9) / 5 + 32;
            } else {
                $out = $rawValue;
            }
        }

        return (int) round($out);
    }
}
