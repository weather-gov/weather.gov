<?php

namespace Drupal\weather_data\Service;

class DateTimeUtility
{
    public static function filterToAfter(
        $array,
        $after,
        $property = "startTime",
    ) {
        return array_values(
            array_filter($array, function ($item) use ($after, $property) {
                $itemTime = property_exists($item, $property)
                    ? $item->$property
                    : $item[$property];

                $itemTime = self::stringToDate($itemTime);

                return $itemTime > $after;
            }),
        );
    }

    public static function filterToBefore(
        $array,
        $before,
        $property = "startTime",
    ) {
        return array_values(
            array_filter($array, function ($item) use ($before, $property) {
                $itemTime = property_exists($item, $property)
                    ? $item->$property
                    : $item[$property];

                $itemTime = self::stringToDate($itemTime);

                return $itemTime < $before;
            }),
        );
    }

    public static function stringToDate($str, $timezone = false)
    {
        if ($str) {
            $datestamp = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $str,
            );
            if ($timezone) {
                $datestamp = $datestamp->setTimeZone(
                    new \DateTimeZone($timezone),
                );
            }

            return $datestamp;
        }
        return $str;
    }
}
