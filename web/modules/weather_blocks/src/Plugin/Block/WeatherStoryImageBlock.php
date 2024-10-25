<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the active weather story for a WFO.
 *
 * @Block(
 *   id = "weathergov_weather_story_image",
 *   admin_label = @Translation("Weather story image block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class WeatherStoryImageBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build()
    {
        $wfo = false;
        if (array_key_exists("wfo", $this->configuration)) {
            $wfo = strtoupper($this->configuration["wfo"]);
        }

        if ($wfo) {
            $story = $this->entityTypeService->getLatestWeatherStoryImageFromWFO(
                $wfo,
                "wfo_weather_story_upload",
            );

            // If we actually have a story, now we can go about pulling data
            // from it to pass along to the template.
            if ($story) {
                $description = $story->get("field_description")->value;
                $description = strip_tags($description);

                // Set the image alt text and get the file URI. Twig will handle
                // turning that into a proper web URL for us.
                $fullimage = $story->get("field_fullimage");
                $image = [
                    "alt" => $description,
                    "uri" => $story
                        ->get("field_fullimage")
                        ->entity->get("uri")
                        ->getString(),
                ];

                $changed = \DateTime::createFromFormat(
                    "U",
                    $story->get("changed")->value,
                );

                $wfo_name = $this->entityTypeService
                    ->getWFOEntity($wfo)
                    ->get("name")
                    ->getString();

                return [
                    "title" => $story->get("title")->getString(),
                    "description" => $description,
                    "image" => $image,
                    "updated" => [
                        "formatted" => $changed->format("M j, Y, g:i A"),
                        "utc" => $changed->format("c"),
                    ],
                    "wfo_code" => $wfo,
                    "wfo_name" => $wfo_name,
                ];
            }
        }

        return [];
    }
}
