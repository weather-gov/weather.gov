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

        if ($location->point) {
            $data = $this->weatherData->getPlaceNearPoint(
                $location->point->lat,
                $location->point->lon,
            );
        } elseif ($location->grid) {
            $grid = $location->grid;
            try {
                $data = $this->weatherData->getPlaceFromGrid(
                    $grid->wfo,
                    $grid->x,
                    $grid->y,
                );
            } catch (\Throwable $e) {
                return ["error" => true];
            }
        }

        if ($data) {
            return [
                "place" => $data,
            ];
        }

        return [
            "place" => null,
        ];
    }
}
