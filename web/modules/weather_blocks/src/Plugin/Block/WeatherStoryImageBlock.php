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
    public function getWFOTaxonomyOptOut($wfoCode)
    {
        $wfo_results = \Drupal::entityTypeManager()
            ->getStorage("taxonomy_term")
            ->loadByProperties([
                "vid" => "weather_forecast_offices",
                "field_wfo_code" => strtoupper($wfoCode),
            ]);
        $wfo_results = array_values($wfo_results); // Indices can be totally random numbers!
        if (count($wfo_results) == 0) {
            throw new NotFoundHttpException();
        }
        return $wfo_results[0]->get('field_weather_story_opt_out')->getValue();
    }

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
            $weatherStoryOptOut = $this->getWFOTaxonomyOptOut($wfo);
            $story = $this->entityTypeService->getLatestWeatherStoryImageFromWFO(
                $wfo,
                "wfo_weather_story_upload",
            );

            if ($story && $weatherStoryOptOut[0]['value'] == 0) {
                // because the weather story description is comes via a xml
                // CDATA tag, we need to strip tags and surrounding whitespace.
                $description = $story->get("field_description")->value;
                $description = trim(strip_tags($description));

                // Set the image alt text and get the file URI. Twig will handle
                // turning that into a proper web URL for us.
                $fullimage = $story->get("field_fullimage");
                $image = [
                    "alt" => "",
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
                    "starttime" => $story->get("field_starttime")->value,
                    "updated" => [
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
