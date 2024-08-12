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
                "wfo_info",
            );

            // If there is WFO info, pull out the parts that should be rendered
            // in the WFO promo block on the forecast page.
            if ($promo) {
                $name = $promo->field_wfo->entity->name->value;
                $code = $promo->field_wfo->entity->field_wfo_code->value;

                $about = $promo->body;
                $phone = $promo->field_phone_number_opt ?? false;

                $facebook = $promo->field_facebook_url ?? false;
                $twitter = $promo->field_twitter_url ?? false;
                $youtube = $promo->field_youtube_url ?? false;

                $social = false;
                if ($facebook || $twitter || $youtube) {
                    $social = [
                        "facebook" => $facebook,
                        "twitter" => $twitter,
                        "youtube" => $youtube,
                    ];
                }

                return [
                    "name" => $name,
                    "code" => $code,
                    "about" => $about,
                    "phone" => $phone,
                    "social" => $social,
                ];
            }

            // If there's not a WFO info, just return the name and code.
            $taxonomyTerm = $this->entityTypeService->getWFOEntity($grid->wfo);
            if (count($taxonomyTerm) > 0) {
                $term = array_pop($taxonomyTerm);
                $name = $term->get("name")->getString();

                return [
                    "name" => $name,
                    "code" => $grid->wfo,
                    "phone" => false,
                    "social" => false,
                ];
            }
        }

        // If we get here, it's because either the location doesn't have a grid
        // point and thus no WFO, or else because we don't know about the WFO.
        return [];
    }
}
