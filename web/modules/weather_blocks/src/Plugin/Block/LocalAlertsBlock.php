<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of active alerts for a location.
 *
 * @Block(
 *   id = "weathergov_local_alerts",
 *   admin_label = @Translation("Local alerts block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class LocalAlertsBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build()
    {
        $location = $this->getLocation();

        if ($location->grid) {
            $grid = $location->grid;

            $data = $this->weatherData->getAlertsForGrid(
                $grid->wfo,
                $grid->x,
                $grid->y,
            );
            return ["alerts" => $data];
        }
        return null;
    }
}
