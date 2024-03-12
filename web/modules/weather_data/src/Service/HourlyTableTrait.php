<?php

namespace Drupal\weather_data\Service;

/**
 * Temporary class
 *
 * Should be incorporated into the Daily forecast
 * trait once this has been rebased and/or merged with
 * the refactored branch.
 */
trait HourlyTableTrait
{
    /**
     * Prepare hourly data for display in each day period
     *
     * Takes the array of _formatted_ day periods
     * (See DailyForecastTrait) and the hourly forecast
     * periods and inserts hourly data into each day,
     * as needed by more detailed daily forecast by
     * hour tables.
     */
    public function getHourlyDetailsForDay(
        &$dayPeriods,
        &$hourlyPeriods,
        &$alerts,
        $isTodayPeriod = false,
    ) {
        foreach ($dayPeriods as &$dayPeriod) {
            if ($isTodayPeriod) {
                $startTimeString = $dayPeriod["startTime"];
            } else {
                $startTimeString = $dayPeriod["daytime"]["startTime"];
            }
            $startTime = \DateTimeImmutable::createFromFormat(
                \DateTimeInterface::ISO8601_EXPANDED,
                $startTimeString,
            );

            if (!$isTodayPeriod) {
                // We want to start the daily period at 6am
                // for any day that is not the current day.
                // For current days, we start at the day period's
                // startTime.
                $startTime = $startTime->setTime(6, 0);
                $endTime = $startTime->add(
                    \DateInterval::createFromDateString("1 day"),
                );
            } else {
                // Otherwise, the endTime should be 6am the following day
                // from the original (today) startTime
                $endTime = $startTime
                    ->setTime(6, 0)
                    ->add(\DateInterval::createFromDateString("1 day"));
            }

            $dayHourlyPeriods = array_filter($hourlyPeriods, function (
                $hourlyPeriod,
            ) use (&$startTime, &$endTime) {
                $hourlyStartTime = \DateTimeImmutable::createFromFormat(
                    \DateTimeInterface::ISO8601_EXPANDED,
                    $hourlyPeriod["timestamp"],
                );

                return $hourlyStartTime >= $startTime &&
                    $hourlyStartTime <= $endTime;
            });

            $dayHourlyPeriods = array_values($dayHourlyPeriods);

            $dayPeriod["hourlyPeriods"] = $dayHourlyPeriods;
            $dayPeriod["alertPeriods"] = $this->alertsToHourlyPeriods(
                $alerts,
                $dayHourlyPeriods,
            );
        }

        return $dayPeriods;
    }
}
