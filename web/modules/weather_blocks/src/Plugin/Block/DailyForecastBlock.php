<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the daily forecast for the next 5 days.
 *
 * @Block(
 *   id = "weathergov_daily_forecast",
 *   admin_label = @Translation("Daily forecast block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class DailyForecastBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build($now = false)
    {
        $location = $this->getLocation();

        if ($location->grid) {
            $grid = $location->grid;

            try {
                return $this->weatherData->getDailyForecastFromGrid(
                    $grid->wfo,
                    $grid->x,
                    $grid->y,
                    $now,
                    3,
                );
            } catch (\Throwable $e) {
                return ["error" => true];
            }
        }
        return null;
    }
}
