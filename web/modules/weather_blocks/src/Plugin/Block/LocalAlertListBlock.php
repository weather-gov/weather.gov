<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of active alerts for a location.
 *
 * @Block(
 *   id = "weathergov_local_alert_list",
 *   admin_label = @Translation("Local alert list block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class LocalAlertListBlock extends WeatherBlockBase
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
                $data = $this->weatherData->getAlertsForGrid(
                    $grid->wfo,
                    $grid->x,
                    $grid->y,
                );
                return ["alerts" => $data];
            } catch (\Throwable $e) {
                return ["error" => true];
            }
        }
        return null;
    }
}
