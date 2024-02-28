<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the hourly forecast precipitation.
 *
 * @Block(
 *   id = "weathergov_hourly_precipitation",
 *   admin_label = @Translation("Hourly precipitation block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class HourlyPrecipitationBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build()
    {
        $location = $this->getLocation();

        if ($location->grid) {
            $grid = $location->grid;

            try {
                $data = $this->weatherData->getHourlyPrecipitation(
                    $grid->wfo,
                    $grid->x,
                    $grid->y,
                );

                return ["periods" => array_slice($data, 0, 3)];
            } catch (\Throwable $e) {
                return ["error" => true];
            }
        }
    }
}
