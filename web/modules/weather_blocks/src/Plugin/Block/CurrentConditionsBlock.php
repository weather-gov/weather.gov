<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the current weather conditions.
 *
 * @Block(
 *   id = "weathergov_current_conditions",
 *   admin_label = @Translation("Current conditions block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class CurrentConditionsBlock extends WeatherBlockBase
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
                if ($location->point) {
                    $place = $this->weatherData->getPlaceNearPoint(
                        $location->point->lat,
                        $location->point->lon,
                    );
                } else {
                    $place = $this->weatherData->getPlaceFromGrid(
                        $grid->wfo,
                        $grid->x,
                        $grid->y,
                    );
                }

                $data = $this->weatherData->getCurrentConditionsFromGrid(
                    $grid->wfo,
                    $grid->x,
                    $grid->y,
                );

                if (!$data) {
                    throw new \Exception("Invalid current observations");
                }

                // We generally expect our internal places to be objects with city
                // and state keys. However, if the user arrived here using location
                // search, we may have gotten a suggested place name that cannot be
                // cleanly parsed into just city and state. In that case, the entire
                // place name is stuffed into the city. So we only want to combine
                // these two if they both actually exist.
                $data["place"] = $place->city;
                if ($place->state) {
                    $data["place"] .= ", " . $place->state;
                }

                return $data;
            } catch (\Throwable $e) {
                $logger = $this->getLogger("observations");
                $logger->error($e->getMessage());
                return ["error" => true];
            }
        }
    }
}
