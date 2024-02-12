<?php

namespace Drupal\weather_blocks\Plugin\Block;

/**
 * Provides a block of the active weather story for a WFO.
 *
 * @Block(
 *   id = "weathergov_dynamic_safety_information",
 *   admin_label = @Translation("Dynamic safety information block"),
 *   category = @Translation("weather.gov"),
 * )
 */
class DynamicSafetyInformationBlock extends WeatherBlockBase
{
    /**
     * {@inheritdoc}
     */
    public function build()
    {
        // We don't want the WFO. We want the hazard event name. That'll
        // come from the twig template
        if ($this->configuration["weather_event"]) {
            $info = $this->entityTypeService->getLatestNodeFromWeatherEvent(
                $this->configuration["weather_event"],
                "dynamic_safety_information",
            );

            // If we actually have a story, now we can go about pulling data
            // from it to pass along to the template.
            if ($info) {
                // And return the stuff that's available to our block template.
                $body = $info->get("body")->getValue();
                $body = array_pop($body);
                $body = $body["value"];

                return [
                    "body" => $body,
                ];
            }
        }

        return [];
    }
}
