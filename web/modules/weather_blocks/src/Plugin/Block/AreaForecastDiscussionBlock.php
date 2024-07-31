<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of active alerts for a location.
 *
 * @Block(
 *   id = "weathergov_area_forecast_discussion",
 *   admin_label = @Translation("Area forecast discussion block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class AreaForecastDiscussionBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build($now = false)
    {
        $location = $this->getLocation();

        if ($location->grid) {
            try {
                $data = $this->weatherData->getLatestAFD($location->grid->wfo);
                return $data;
            } catch (\Throwable $e) {
                $logger = $this->getLogger("afds");
                $logger->error($e->getMessage());
                return ["error" => true];
            }
        }
        return null;
    }
}
