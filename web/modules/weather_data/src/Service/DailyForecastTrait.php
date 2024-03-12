<?php

namespace Drupal\weather_data\Service;

trait DailyForecastTrait
{
    private function formatDailyPeriod($period, $timezone = null)
    {
        // Early return if we haven't passed in anything
        if (!$period) {
            return null;
        }

        // Daily forecast cards require the three-letter
        // abrreviated form of the day name.
        $startTime = DateTimeUtility::stringToDate(
            $period->startTime,
            $timezone,
        );

        $shortDayName = $startTime->format("D");
        $dayName = $startTime->format("l");
        $monthAndDay = $startTime->format("M j");

        // Sentence-case the forecast description.
        $shortForecast = ucfirst(strtolower($period->shortForecast));

        // Return a formatted assoc array that can be
        // used by the templates
        return [
            "shortDayName" => $shortDayName,
            "dayName" => $dayName,
            "monthAndDay" => $monthAndDay,
            "startTime" => $startTime->format("c"),
            "shortForecast" => $this->t->translate($shortForecast),
            "icon" => $this->getIcon($period),
            "temperature" => $period->temperature,
            "probabilityOfPrecipitation" =>
                $period->probabilityOfPrecipitation->value,
            "isDaytime" => $period->isDaytime,
        ];
    }

    /**
     * Get the daily forecast for a location.
     *
     * Note that the $now object should *NOT* be set. It's a dependency injection
     * hack so we can mock the current date/time.
     *
     * @return array
     *   The daily forecast as an associative array.
     */
    public function getDailyForecastFromGrid(
        $wfo,
        $x,
        $y,
        $now = false,
        $defaultDays = 5,
    ) {
        $forecast = $this->dataLayer->getDailyForecast($wfo, $x, $y);

        $place = $this->getPlaceFromGrid($wfo, $x, $y);
        $timezone = $place->timezone;

        $periods = $forecast->periods;

        // Grab the hourly forecast period information
        // and any relevant alerts so we can use them
        // in the hourly details table for each day
        $hourlyPeriods = $this->getHourlyForecastFromGrid($wfo, $x, $y);
        $point = $this->stashedPoint;
        if (!$point) {
            $point = $this->getGeometryFromGrid($wfo, $x, $y);
        }
        $grid = $this->getGridFromLatLon($point->lat, $point->lon);
        $alerts = $this->getAlerts($grid, $point);

        // In order to keep the time zones straight,
        // we set the "current" (now) time to be
        // the startTime of the first period.
        if (!($now instanceof \DateTimeImmutable)) {
            $now = DateTimeUtility::stringToDate(
                $periods[0]->startTime,
                $timezone,
            );
        }

        $tomorrow = $now->modify("tomorrow");

        // These are the periods that correspond to "today".
        // Usually they are 1 or two periods, depending on when
        // during the day the call is made to the API.
        // Examples of period names here include "Today"
        // "This Afternoon" "Tonight" "Overnight" etc
        $todayPeriods = DateTimeUtility::filterToBefore($periods, $tomorrow);
        $futurePeriods = DateTimeUtility::filterToAfter($periods, $tomorrow);

        // Detailed periods are the periods for which
        // we want to show a detailed daily forecast.
        // Periods are either daytime or nighttime
        // periods, as told by the isDaytime property
        $detailedPeriods = array_slice($futurePeriods, 0, $defaultDays * 2);

        // The extended periods are all the periods
        // returned by the API that come after the
        // detailed periods.
        // In the UI, we will show less detailed
        // information for these periods
        $extendedPeriods = array_slice($futurePeriods, $defaultDays * 2);

        // Format each of the today periods
        // as assoc arrays that can be used
        // by the templates
        $todayPeriodsFormatted = array_map(function ($period) use (&$timezone) {
            return $this->formatDailyPeriod($period, $timezone);
        }, $todayPeriods);

        // Format each of the detailed periods
        // as assoc arrays that can be used by
        // the templates. Also group the periods
        // into daytime and nighttime pairs
        $detailedPeriodsFormatted = array_map(function ($periodPair) use (
            &$timezone,
        ) {
            $day = $periodPair[0];
            $night = $periodPair[1];

            return [
                "daytime" => $this->formatDailyPeriod($day, $timezone),
                "overnight" => $this->formatDailyPeriod($night, $timezone),
            ];
        }, array_chunk($detailedPeriods, 2));

        // Format each of the extended periods as
        // assoc arrays that can be used by the
        // templates. Also group the periods
        // into daytime and nighttime pairs
        $extendedPeriodsFormatted = array_map(function ($periodPair) use (
            &$timezone,
        ) {
            $day = $periodPair[0];
            $night = $periodPair[1];

            return [
                "daytime" => $this->formatDailyPeriod($day, $timezone),
                "overnight" => $this->formatDailyPeriod($night, $timezone),
            ];
        }, array_chunk($extendedPeriods, 2));

        // Get detailed hourly data for the today
        // daily period (for display)
        $this->getHourlyDetailsForDay(
            $todayPeriodsFormatted,
            $hourlyPeriods,
            $alerts,
            true,
        );
        if (count($todayPeriodsFormatted) > 1) {
            $todayHourlyDetails = array_merge(
                $todayPeriodsFormatted[0]["hourlyPeriods"],
                $todayPeriodsFormatted[1]["hourlyPeriods"],
            );
            $todayHourlyDetails = array_unique(
                $todayHourlyDetails,
                \SORT_REGULAR,
            );
        } else {
            $todayHourlyDetails = $todayPeriodsFormatted[0]["hourlyPeriods"];
        }

        // Format each of the detailed periods
        // as assoc arrays that can be used by
        // the templates. Also group the periods
        // into daytime and nighttime pairs
        $detailedPeriodsFormatted = array_map(function ($periodPair) {
            $day = $periodPair[0];
            $night = $periodPair[1];

            return [
                "daytime" => $this->formatDailyPeriod($day),
                "overnight" => $this->formatDailyPeriod($night),
            ];
        }, array_chunk($detailedPeriods, 2));

        // Get detailed hourly data for the
        // detailed forecast days
        $this->getHourlyDetailsForDay(
            $detailedPeriodsFormatted,
            $hourlyPeriods,
            $alerts,
        );

        return [
            "today" => array_values($todayPeriodsFormatted),
            "todayHourly" => $todayHourlyDetails,
            "detailed" => array_values($detailedPeriodsFormatted),
            "extended" => array_values($extendedPeriodsFormatted),
        ];
    }
}
