<?php

namespace Drupal\weather_data\Service;

use Drupal\Core\Site\Settings;

class DateTimeUtility
{
    /**
     * For testing purposes, we want the ability
     * to override what 'now' means in code
     * rather than just from the drupal setting
     */
    private static $nowOverriddenTimestamp;

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

    /**
     * Sets a private static variable to be an instance
     * of a DateTimeImmutable based on the passed in
     * ISO timestamp string.
     * Once set, this will be the value given by
     * DateTimeUtility::now().
     * It takes precedence over any Drupal setting
     * for the now time.
     */
    public static function setNow(string $timestamp)
    {
        self::$nowOverriddenTimestamp = \DateTimeImmutable::createFromFormat(
            \DateTimeInterface::ISO8601_EXPANDED,
            $nowSetting,
        );
    }

    /**
     * Sets the internal variable for the now time to
     * null.
     * Once unset, DateTimeUtility::now() calls will
     * respond with either a timestamp from the Drupal
     * settings or the actual 'now' time
     */
    public static function unsetNow()
    {
        self::$nowOverriddenTimestamp = null;
    }

    /**
     * Responds with a DateTimeImmutable instance corresponding
     * to 'now' that will be used throughout the application.
     *
     * Note that 'now' is designed to be overriden in two possible
     * ways:
     * 1) Via setting the now override of this class (see ::setNow())
     * 2) By setting the 'wx_now_timestamp' Drupal setting to an ISO timestamp
     *
     * If neither 1 or 2 are set, this method will simply return the
     * current datetime given the provided timezone
     */
    public static function now(string | \DateTimeZone $timezone = null)
    {
        // If we have overridden the now timestamp in
        // code (ie via static class method overrides)
        // then simply return that cached value
        if(self::$nowOverriddenTimestamp){
            return self::$nowOverriddenTimestamp;
        }

        // If there is a timestamp set in the Drupal settings
        // (which can come from our ENV variables originally)
        // then use that instead of the actual now
        $all = Settings::getAll();
        $nowSetting = Settings::get('wx_now_timestamp', false);
        if($nowSetting){
            return \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $nowSetting,
            );
        }

        // Otherwise, return the actual now time according
        // to the supplied timezone
        $tz = $timezone;
        if(is_string($tz)){
            $tz = new \DateTimeZone($tz);
        }
        return new \DateTimeImmutable('now', $tz);
    }
}
