<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the WFO promo content for the current locaiton.
 *
 * @Block(
 *   id = "weathergov_wfo_promo",
 *   admin_label = @Translation("WFO Promo block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class WFOPromoBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build()
    {
        $location = $this->getLocation();

        if ($location->grid) {
            $grid = $location->grid;

            $promo = $this->entityTypeService->getLatestNodeFromWFO(
                $grid->wfo,
                "wfo_promo",
            );

            // If we actually have a story, pass its ID on for the template
            if ($promo) {
                return [
                    "node" => $promo->id(),
                ];
            }
        }

        return [];
    }
}
