<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block for searching for locations.
 *
 * @Block(
 *   id = "weathergov_location_search",
 *   admin_label = @Translation("Location search block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class LocationSearchBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build()
    {
        $data = false;
        $location = $this->getLocation();

        try {
            if ($location->point) {
                $data = $this->weatherData->getPlaceNearPoint(
                    $location->point->lat,
                    $location->point->lon,
                );
            } elseif ($location->grid) {
                $grid = $location->grid;
                $data = $this->weatherData->getPlaceFromGrid(
                    $grid->wfo,
                    $grid->x,
                    $grid->y,
                );
            }

            if ($data) {
                return [
                    "place" => $data,
                ];
            }

            return [
                "place" => null,
            ];
        } catch (\Throwable $e) {
            $logger = $this->getLogger("location search");
            $logger->error($e->getMessage());
            return ["error" => true];
        }
    }
}
