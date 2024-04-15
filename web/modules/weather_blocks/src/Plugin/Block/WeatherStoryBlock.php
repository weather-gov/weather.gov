<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the active weather story for a WFO.
 *
 * @Block(
 *   id = "weathergov_weather_story",
 *   admin_label = @Translation("Weather story block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class WeatherStoryBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build()
    {
        $location = $this->getLocation();

        if ($location->grid) {
            $grid = $location->grid;

            $story = $this->entityTypeService->getLatestNodeFromWFO(
                $grid->wfo,
                "weather_story",
            );

            // If we actually have a story, now we can go about pulling data
            // from it to pass along to the template.
            if ($story) {
                // If there's an image, get its alt text and file URI. Twig will
                // handle turning that into a proper web URL for us.
                $image = $story->get("field_image");
                if ($image->get(0)) {
                    $image = [
                        "alt" => $story
                            ->get("field_image")
                            ->get(0)
                            ->get("alt")
                            ->getString(),
                        "uri" => $story
                            ->get("field_image")
                            ->entity->get("uri")
                            ->getString(),
                    ];
                } else {
                    $image = null;
                }

                // And return the stuff that's available to our block template.
                $body = $story->get("body")->getValue();
                $body = array_pop($body);
                $body = $body["value"];

                $changed = \DateTime::createFromFormat(
                    "U",
                    $story->get("changed")->value,
                );

                return [
                    "title" => $story->get("title")->getString(),
                    "body" => $body,
                    "image" => $image,
                    "updated" => [
                        "formatted" => $changed->format("M j, Y, g:i A"),
                        "utc" => $changed->format("c"),
                    ],
                ];
            }
        }

        return [];
    }
}
