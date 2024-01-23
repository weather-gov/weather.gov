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

            // If we actually have a story, now we can go about pulling data
            // from it to pass along to the template.
            if ($promo) {
                // And return the stuff that's available to our block template.
                $shortIntro = $promo->get("body")->getValue();
                $shortIntro = array_pop($shortIntro);
                $shortIntro = $shortIntro["value"];

                $wfoName = $promo->get("title")->getString();
                $phone = $promo->get("field_phone_number")->getString();

                $social = [];
                $facebook = $promo->get("field_facebook_url")->getString();
                if ($facebook) {
                    $social["facebook"] = $facebook;
                }

                $twitter = $promo->get("field_twitter_url")->getString();
                if ($twitter) {
                    $social["twitter"] = $twitter;
                }

                $youtube = $promo->get("field_youtube_url")->getString();
                if ($youtube) {
                    $social["youtube"] = $youtube;
                }

                return [
                    "name" => $wfoName,
                    "code" => $grid->wfo,
                    "shortIntro" => $shortIntro,
                    "phone" => $phone,
                    "social" => count($social) ? $social : false,
                ];
            }
        }

        return [];
    }
}
