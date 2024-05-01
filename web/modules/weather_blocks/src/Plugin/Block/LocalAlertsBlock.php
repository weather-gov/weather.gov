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
    public function build($now = false)
    {
        $location = $this->getLocation();

        if ($location->grid && $location->point) {
            try {
                $data = $this->weatherData->getAlerts(
                    $location->grid,
                    $location->point,
                    false,
                    $now,
                );
                return ["alerts" => $data];
            } catch (\Throwable $e) {
                return ["error" => true];
            }
        }
        return null;
    }
}
