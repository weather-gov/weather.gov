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
            "endTime" => $period->endTime,
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
            $now = DateTimeUtility::now($timezone);
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

        $allPrecipPeriods = $this->getHourlyPrecipitation($wfo, $x, $y, $now);
        $allPrecipPeriods = array_map(function ($period) {
            $valid = $period->validTime;
            $value = $period->value;
            $value = UnitConversion::millimetersToInches($value);

            $valid = explode("/", $valid);
            $start = DateTimeUtility::stringToDate($valid[0], $timezone);

            $duration = new \DateInterval($valid[1]);
            $end = $start->add($duration);

            return (object) [
                "start" => $start,
                "end" => $end,
                "value" => round($value, 2),
            ];
        }, $allPrecipPeriods);

        $tomorrow = $now->modify("tomorrow");

        // These are the periods that correspond to "today".
        // Usually they are 1 or two periods, depending on when
        // during the day the call is made to the API.
        // Examples of period names here include "Today"
        // "This Afternoon" "Tonight" "Overnight" etc
        $todayPeriods = DateTimeUtility::filterToBefore($periods, $tomorrow);

        // And future periods.
        $detailedPeriods = DateTimeUtility::filterToAfter($periods, $tomorrow);

        // We keep those separate primarily because the "today" period can have
        // 1, 2, or 3 periods. Future periods will only have 2 periods, so we
        // can safely chunk them. (Except the very last day, which may only
        // have one period, but that works out fine because it'll be the
        // morning period. I.e., We'll never have a future day with an evening
        // but without a morning. That can happen for today, though.)

        $all = [$todayPeriods, ...array_chunk($detailedPeriods, 2)];

        $all = array_map(
            function ($day, $dayIndex) use (
                &$now,
                &$timezone,
                &$hourlyPeriods,
                &$alerts,
                &$allPrecipPeriods,
            ) {
                // For each day, get the component periods, formatted.
                $periods = array_map(function ($period) use (
                    &$now,
                    &$timezone,
                ) {
                    $formatted = $this->formatDailyPeriod($period, $timezone);

                    // If we're doing the first day, we need to handle it a
                    // little bit differently.
                    if ($dayIndex === 0 && $formatted) {
                        // For "today" periods, we need to get date information from the current
                        // time, not from the forecast period because the first forecast period
                        // for "today" could actually be from "yesterday" if it begins before
                        // midnight. See #1151.
                        $shortDayName = $now->format("D");
                        $dayName = $now->format("l");
                        $monthAndDay = $now->format("M j");

                        $formatted["shortDayName"] = $shortDayName;
                        $formatted["dayName"] = $dayName;
                        $formatted["monthAndDay"] = $monthAndDay;

                        // We need to determine if the period is an "overnight"
                        // period. These are periods whose startTime begins on or
                        // after midnight of the current day, and whose endTime is
                        // 6am of the current day
                        $startTime = DateTimeUtility::stringToDate(
                            $period->startTime,
                            $timezone,
                        );
                        $endTime = DateTimeUtility::stringToDate(
                            $period->endTime,
                            $timezone,
                        );
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
                            intval($now->format("G")) <= 6 &&
                            $endTime <= $overnightEnd;

                        $formatted["isOvernight"] = $isOvernightPeriod;

                        // Provide formatted parentheticals about the coverage
                        // of each time period (in text form)
                        // These are only present on the "today" time periods
                        if ($isOvernightPeriod) {
                            $formatted["timeLabel"] = "NOW-6AM";
                        } elseif ($formatted["isDaytime"]) {
                            $formatted["timeLabel"] = "6AM-6PM";
                        } else {
                            $formatted["timeLabel"] = "6PM-6AM";
                        }
                    }

                    return $formatted;
                }, $day);

                // If this is the first day and there is only one period, then
                // it is an overnight period and we will only show the low
                // temperature. (In any other case with just one period, we will
                // show the high temperature.)
                $useOnlyLow = $dayIndex === 0 && count($periods) === 1;

                // Now find the start and end time of the full day so we can use
                // that to get the right hourly forecast, alerts, and precipitation.
                $start = DateTimeUtility::stringToDate(
                    $periods[0]["startTime"],
                    $timezone,
                );
                $end = DateTimeUtility::stringToDate(
                    end($periods)["endTime"],
                    $timezone,
                );

                // We only want the hourly periods within this day's range,
                // inclusive off the start of the day.
                $hourPeriods = DateTimeUtility::filterToOnOrAfter(
                    $hourlyPeriods,
                    $start,
                    "timestamp",
                );
                $hourPeriods = DateTimeUtility::filterToBefore(
                    $hourPeriods,
                    $end,
                    "timestamp",
                );

                // Now get our alerts for the day, formatted with hour period
                // offsets and duration.
                $dayAlerts = $this->alertsToHourlyPeriods(
                    $alerts,
                    $hourPeriods,
                );
                $highestAlertLevel = AlertUtility::getHighestAlertLevel(
                    array_map(function ($alert) {
                        return $alert["alert"];
                    }, $dayAlerts),
                );

                // Get the first and last hours in our hourly data. We'll use
                // these to filter alerts and precip.
                $firstHour = DateTimeUtility::stringToDate(
                    $hourPeriods[0]["timestamp"],
                );
                $lastHour = DateTimeUtility::stringToDate(
                    $hourPeriods[array_key_last($hourPeriods)]["timestamp"],
                );
                $lastHour = $lastHour->modify("+1 hour");

                $precipPeriods = array_filter($allPrecipPeriods, function (
                    $period,
                ) use (&$firstHour, &$lastHour) {
                    if (
                        $period->start < $lastHour &&
                        $period->end > $firstHour
                    ) {
                        return true;
                    }
                    return false;
                });

                $periodIndex = 0;
                $precipPeriods = array_map(function ($period) use (
                    &$periodIndex,
                    $firstHour,
                    $lastHour,
                ) {
                    $duration = $period->end->diff($period->start)->h;

                    // If the precipitation period starts before our first hour
                    // in the table, then we need to adjust the duration that
                    // we show.
                    if ($period->start < $firstHour) {
                        $duration -= $period->start->diff($firstHour)->h;
                    }
                    // Similarly if the precipitation period ends after our last
                    // hour, adjust. BOTH OF THESE CAN BE TRUE.
                    if ($period->end > $lastHour) {
                        $duration -= $lastHour->diff($period->end)->h;
                    }

                    $myIndex = $periodIndex;
                    $periodIndex += $duration;

                    return [
                        "periodIndex" => $myIndex,
                        "duration" => $duration,
                        "value" => $period->value,
                    ];
                }, $precipPeriods);

                $precipPeriods = array_filter($precipPeriods, function (
                    $period,
                ) {
                    return $period["value"] > 0;
                });

                $day = [
                    "periods" => $periods,
                    "useOnlyLow" => $useOnlyLow,
                    "hourPeriods" => $hourPeriods,
                    "alerts" => $dayAlerts,
                    "highestAlertLevel" => $highestAlertLevel,
                    "precipPeriods" => $precipPeriods,
                ];

                return $day;
            },
            $all,
            array_keys($all),
        );

        return $all;

        // =====================================================================

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

        // Get raw precipitation periods data, then map and
        // chunk into groups of periods based on each day's
        // startTime
        $precipPeriods = $this->getHourlyPrecipitation($wfo, $x, $y, $now);

        // Get detailed hourly data for the today
        // daily period (for display)
        $this->getHourlyDetailsForDay(
            $todayPeriodsFormatted,
            $hourlyPeriods,
            $alerts,
            $precipPeriods,
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

        // Array of only the alert objects for today
        $todayAlertItems = array_map(function ($todayAlert) {
            return $todayAlert["alert"];
        }, $todayAlerts);

        $todayHighestAlertLevel = AlertUtility::getHighestAlertLevel(
            $todayAlertItems,
        );

        // Get detailed hourly data for the
        // detailed forecast days
        $this->getHourlyDetailsForDay(
            $detailedPeriodsFormatted,
            $hourlyPeriods,
            $alerts,
            $precipPeriods,
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
            "todayHighestAlertLevel" => $todayHighestAlertLevel,
            "detailed" => array_values($detailedPeriodsFormatted),
            "precipitationPeriods" => array_values($precipPeriods),
            "useOnlyLowForToday" => $useOnlyLowForToday,
        ];
    }
}
