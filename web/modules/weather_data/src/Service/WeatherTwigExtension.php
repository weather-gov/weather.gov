<?php

namespace Drupal\weather_data\Service;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;
use Twig\Extension\ExtensionInterface;

class WeatherTwigExtension extends AbstractExtension
{
    public function getFunctions()
    {
        return [
            new TwigFunction(
                "normalize_wfo",
                [$this, "normalizeWFO"],
                ["is_safe" => ["html"]],
            ),
        ];
    }

    public function getFilters()
    {
        return [new TwigFilter("normalize_wfo", [$this, "normalizeWFO"])];
    }

    /**
     * Handle the edge cases of WFO codes
     * for Alaska/Anchorage
     */
    public function normalizeWFO($wfo)
    {
        if (!$wfo){
            return "";
        }
        $anchorageAlternates = ["alu", "aer"];
        $isAlternate = in_array(strtolower($wfo), $anchorageAlternates);
        if ($isAlternate) {
            return "AFC";
        }

        return $wfo;
    }
}
