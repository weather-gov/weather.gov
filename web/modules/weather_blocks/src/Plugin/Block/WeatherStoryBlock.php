<?php

namespace Drupal\weather_blocks\Plugin\Block;

use Drupal;
use Drupal\node\Entity\Node;

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

            $nodes = Node::loadMultiple(
                Drupal::entityTypeManager()
                    ->getStorage("node")
                    ->getQuery()
                    ->accessCheck(false)
                    ->condition("type", "weather_story")
                    ->sort("changed", "ASC")
                    ->execute(),
            );

            $filtered = array_filter($nodes, function ($node) use ($grid) {
                $wfo = $node->get("field_wfo");
                if ($wfo) {
                    // There should only be one WFO associated with the node, so
                    // just pop it off the array. Don't try to grab it by index
                    // because only the Drupal gods (and maybe not even they)
                    // know what the index might be.
                    $wfo = array_pop($wfo->referencedEntities());

                    if ($wfo) {
                        // At this point, $wfo should be a taxonomy object. We
                        // are only interested in the name. getValue() here
                        // returns another object, but we only care about the
                        // stringy value, so go straight to that.
                        $wfo = $wfo->get("field_wfo_code")->getString();

                        // Only keep this weather story if it's for the same WFO
                        // as our grid location.
                        return strtoupper($wfo) == strtoupper($grid->wfo);
                    }
                }

                // If any of the prior checks fail, just filter this one out. It
                // clearly isn't one we're interested in.
                return false;
            });

            $story = array_pop($filtered);
            if ($story) {
                $story = Drupal::entityTypeManager()
                    ->getViewBuilder("node")
                    ->view($story);

                $story = $story["#node"];

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

                return [
                    "title" => $story->get("title")->getString(),
                    "body" => array_pop($story->get("body")->getValue())[
                        "value"
                    ],
                    "image" => $image,
                ];
            }
        }

        return null;
    }
}
