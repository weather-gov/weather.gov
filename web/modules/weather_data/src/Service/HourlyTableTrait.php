<?php

namespace Drupal\weather_data\Service;

/**
 * Temporary class
 *
 * Should be incorporated into the Daily forecast
 * trait once this has been rebased and/or merged with
 * the refactored branch.
 */
trait HourlyTableTrait {

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
            )->setTime(6, 0);

            $endTime = $startTime->add(\DateInterval::createFromDateString("1 day"));

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
