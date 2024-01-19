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

            // Get the ID for the WFO taxonomy term that matches our grid WFO.
            $termID = $this->entityTypeManager
                ->getStorage("taxonomy_term")
                ->loadByProperties(["field_wfo_code" => $grid->wfo]);

            // If we don't get any results, that means we don't have a WFO
            // taxonomy code for this WFO. By definition, we also can't have any
            // weather stories for it, so we can bail out now.
            if (count($termID) === 0) {
                return null;
            }

            // loadByProperties returns an associative array where the indices
            // are actually the term IDs, so we can't just take the 0th index
            // here. Sigh. Instead, pop the single element out of the array.
            $termID = array_pop($termID)
                ->get("tid")
                ->getString();

            // The entity manager interface doesn't have convenience methods for
            // the kind of filtering we want to do, but the entity query
            // interface lets us get really specific. The result of this query
            // is all node ID for the most recent weather story tagged with our
            // target WFO.
            $nodeID = $this->entityTypeManager
                ->getStorage("node")
                ->getQuery()
                ->accessCheck(false)
                ->condition("type", "weather_story")
                ->condition("field_wfo", $termID)
                ->sort("changed", "DESC")
                // Only get the first one.
                ->range(0, 1)
                ->execute();
            // It's still returned as an associated array, though, so pop.
            // Always be popping.
            $nodeID = array_pop($nodeID);

            // Then we can use the convenience method to actually load the
            // weather story node.
            $story = $this->entityTypeManager
                ->getStorage("node")
                ->load($nodeID);

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

                return [
                    "title" => $story->get("title")->getString(),
                    "body" => $body,
                    "image" => $image,
                ];
            }
        }

        return null;
    }
}
