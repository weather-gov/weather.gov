<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal\Core\Logger\LoggerChannelTrait;

/**
 * Provides a block of the hourly (short term) weather conditions.
 *
 * @Block(
 *   id = "weathergov_hourly_forecast",
 *   admin_label = @Translation("Hourly forecast block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class HourlyForecastBlock extends WeatherBlockBase
{
    use LoggerChannelTrait;

    /**
     * {@inheritdoc}
     */
    public function build($now = false)
    {
        $location = $this->getLocation();

        if ($location->grid) {
            $grid = $location->grid;

            try {
                $data = $this->weatherData->getHourlyForecastFromGrid(
                    $grid->wfo,
                    $grid->x,
                    $grid->y,
                    $now,
                );

                $data = $this->weatherData->filterHoursToSingleDay($data);

                // Also retrieve any alerts that overlap with
                // the given hourly periods
                $alerts = $this->weatherData->getAlerts(
                    $location->grid,
                    $location->point,
                );

                $alertPeriods = $this->weatherData->alertsToHourlyPeriods(
                    $alerts,
                    $data,
                );

                return ["hours" => $data, "alertPeriods" => $alertPeriods];
            } catch (\Throwable $e) {
                $logger = $this->getLogger("hourly forecast");
                $logger->error($e->getMessage());
                return ["error" => true];
            }
        }
        return null;
    }
}
