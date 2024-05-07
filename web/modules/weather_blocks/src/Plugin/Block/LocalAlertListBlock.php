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

        if ($location->grid && $location->point) {
            try {
                $data = $this->weatherData->getAlerts(
                    $location->grid,
                    $location->point,
                );
                return ["alerts" => $data];
            } catch (\Throwable $e) {
                $logger = $this->getLogger("alert list");
                $logger->error($e->getMessage());
                return ["error" => true];
            }
        }
        return null;
    }
}
