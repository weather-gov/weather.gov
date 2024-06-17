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

    private function formatDailyPeriodForToday($period, $timezone, $now)
    {
        $formattedPeriod = $this->formatDailyPeriod($period, $timezone);

        // Early return if no period was passed
        if (!$formattedPeriod) {
            return null;
        }

        // For "today" periods, we need to get date information from the current
        // time, not from the forecast period because the first forecast period
        // for "today" could actually be from "yesterday" if it begins before
        // midnight. See #1151.
        $shortDayName = $now->format("D");
        $dayName = $now->format("l");
        $monthAndDay = $now->format("M j");

        $formattedPeriod["shortDayName"] = $shortDayName;
        $formattedPeriod["dayName"] = $dayName;
        $formattedPeriod["monthAndDay"] = $monthAndDay;

        // We need to determine if the period is an "overnight"
        // period. These are periods whose startTime begins on or
        // after midnight of the current day, and whose endTime is
        // 6am of the current day
        $startTime = DateTimeUtility::stringToDate(
            $period->startTime,
            $timezone,
        );
        $endTime = DateTimeUtility::stringToDate($period->endTime, $timezone);
        $midnight = $now->setTime(0, 0);
        $overnightEnd = $now->setTime(6, 0);

        // This is an overnight period if the current time is between midnight
        // and 6am, and the period ends on or before 6am of the same day.
        //
        // If now is before midnight, this must either be a day or night period.
        // It can only become a̵ ̵g̵r̵e̵m̵l̵i̵n̵ an overnight period at midnight.
        //
        // If now is after midnight and this period ends after 6am, then it must
        // also be a day or night period.
        $isOvernightPeriod =
            intval($now->format("G")) <= 6 && $endTime <= $overnightEnd;

        $formattedPeriod["isOvernight"] = $isOvernightPeriod;

        // Provide formatted parentheticals about the coverage
        // of each time period (in text form)
        // These are only present on the "today" time periods
        if ($isOvernightPeriod) {
            $formattedPeriod["timeLabel"] = "NOW-6AM";
        } elseif ($formattedPeriod["isDaytime"]) {
            $formattedPeriod["timeLabel"] = "6AM-6PM";
        } else {
            $formattedPeriod["timeLabel"] = "6PM-6AM";
        }

        return $formattedPeriod;
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

        // In order to keep the time zones straight,
        // we set the "current" (now) time to be
        // the startTime of the first period.
        if (!($now instanceof \DateTimeImmutable)) {
            $now = new \DateTimeImmutable("now", new \DateTimeZone($timezone));
        }

        // Fetch the actual daily forecast periods
        $periods = DateTimeUtility::filterToAfter(
            $forecast->periods,
            $now,
            "endTime",
        );

        // Grab the hourly forecast period information
        // and any relevant alerts so we can use them
        // in the hourly details table for each day
        $hourlyPeriods = $this->getHourlyForecastFromGrid($wfo, $x, $y, $now);
        $point = self::$stashedPoint;
        if (!$point) {
            $point = $this->getGeometryFromGrid($wfo, $x, $y)[0];
        }
        $grid = $this->getGridFromLatLon($point->lat, $point->lon);
        $alerts = $this->getAlerts($grid, $point);

        $tomorrow = $now->modify("tomorrow");

        // These are the periods that correspond to "today".
        // Usually they are 1 or two periods, depending on when
        // during the day the call is made to the API.
        // Examples of period names here include "Today"
        // "This Afternoon" "Tonight" "Overnight" etc
        $todayPeriods = DateTimeUtility::filterToBefore($periods, $tomorrow);

        // And future periods.
        $detailedPeriods = DateTimeUtility::filterToAfter($periods, $tomorrow);

        // Format each of the today periods
        // as assoc arrays that can be used
        // by the templates
        $todayPeriodsFormatted = array_map(function ($period) use (
            &$now,
            &$timezone,
        ) {
            return $this->formatDailyPeriodForToday($period, $timezone, $now);
        }, $todayPeriods);

        // Format each of the detailed periods
        // as assoc arrays that can be used by
        // the templates. Also group the periods
        // into daytime and nighttime pairs
        $detailedPeriodsFormatted = array_map(function ($periodPair) use (
            &$timezone,
        ) {
            $day = $periodPair[0];
            // The last day in the forecast can sometimes only have the first
            // half of the pair. Defend against that.
            $night = count($periodPair) > 1 ? $periodPair[1] : null;

            return [
                "daytime" => $this->formatDailyPeriod($day, $timezone),
                "nighttime" => $this->formatDailyPeriod($night, $timezone),
            ];
        }, array_chunk($detailedPeriods, 2));

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

        $todayAlerts = $this->alertsToHourlyPeriods(
            $alerts,
            $todayHourlyDetails,
        );

        // Get detailed hourly data for the
        // detailed forecast days
        $this->getHourlyDetailsForDay(
            $detailedPeriodsFormatted,
            $hourlyPeriods,
            $alerts,
        );

        // Get a mapping of the starTime for each day,
        // starting with the today period. These will
        // be used for grouping precipitation totals
        // for each day.
        $periodStartTimes = [
            DateTimeUtility::stringToDate(
                $todayPeriods[0]->startTime,
                $timezone,
            ),
        ];
        $detailedPeriodStartTimes = array_map(function ($periodPair) use (
            &$timezone,
        ) {
            return DateTimeUtility::stringToDate(
                $periodPair[0]->startTime,
                $timezone,
            );
        }, array_chunk($detailedPeriods, 2));
        $periodStartTimes = array_merge(
            $periodStartTimes,
            $detailedPeriodStartTimes,
        );

        // Get raw precipitation periods data, then map and
        // chunk into groups of periods based on each day's
        // startTime
        $precipPeriods = $this->getHourlyPrecipitation($wfo, $x, $y, $now);
        $precipPeriods = array_map(function ($startTime) use (
            &$precipPeriods,
            &$timezone,
        ) {
            return $this->filterHourlyPrecipitationToDay(
                $startTime,
                $precipPeriods,
                $timezone,
            );
        }, $periodStartTimes);

        $useOnlyLowForToday = count($todayPeriodsFormatted) == 1;

        return [
            "today" => array_values($todayPeriodsFormatted),
            "todayHourly" => array_values($todayHourlyDetails),
            "todayAlerts" => array_values($todayAlerts),
            "detailed" => array_values($detailedPeriodsFormatted),
            "precipitationPeriods" => array_values($precipPeriods),
            "useOnlyLowForToday" => $useOnlyLowForToday
        ];
    }
}
