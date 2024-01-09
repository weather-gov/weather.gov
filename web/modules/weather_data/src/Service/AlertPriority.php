<?php

namespace Drupal\weather_data\Service;

class AlertPriority
{
    private static $priorities = [
        "tsunami warning",
        "tornado warning",
        "extreme wind warning",
        "severe thunderstorm warning",
        "flash flood warning",
        "flash flood statement",
        "severe weather statement",
        "shelter in place warning",
        "evacuation immediate",
        "civil danger warning",
        "nuclear power plant warning",
        "radiological hazard warning",
        "hazardous materials warning",
        "fire warning",
        "civil emergency message",
        "law enforcement warning",
        "storm surge warning",
        "hurricane force wind warning",
        "hurricane warning",
        "typhoon warning",
        "special marine warning",
        "blizzard warning",
        "snow squall warning",
        "ice storm warning",
        "winter storm warning",
        "high wind warning",
        "tropical storm warning",
        "storm warning",
        "tsunami advisory",
        "tsunami watch",
        "avalanche warning",
        "earthquake warning",
        "volcano warning",
        "ashfall warning",
        "coastal flood warning",
        "lakeshore flood warning",
        "flood warning",
        "high surf warning",
        "dust storm warning",
        "blowing dust warning",
        "lake effect snow warning",
        "excessive heat warning",
        "tornado watch",
        "severe thunderstorm watch",
        "flash flood watch",
        "gale warning",
        "flood statement",
        "wind chill warning",
        "extreme cold warning",
        "hard freeze warning",
        "freeze warning",
        "red flag warning",
        "storm surge watch",
        "hurricane watch",
        "hurricane force wind watch",
        "typhoon watch",
        "tropical storm watch",
        "storm watch",
        "hurricane local statement",
        "typhoon local statement",
        "tropical storm local statement",
        "tropical depression local statement",
        "avalanche advisory",
        "winter weather advisory",
        "wind chill advisory",
        "heat advisory",
        "urban and small stream flood advisory",
        "small stream flood advisory",
        "arroyo and small stream flood advisory",
        "flood advisory",
        "hydrologic advisory",
        "lakeshore flood advisory",
        "coastal flood advisory",
        "high surf advisory",
        "heavy freezing spray warning",
        "dense fog advisory",
        "dense smoke advisory",
        "small craft advisory",
        "brisk wind advisory",
        "hazardous seas warning",
        "dust advisory",
        "blowing dust advisory",
        "lake wind advisory",
        "wind advisory",
        "frost advisory",
        "ashfall advisory",
        "freezing fog advisory",
        "freezing spray advisory",
        "low water advisory",
        "local area emergency",
        "avalanche watch",
        "blizzard watch",
        "rip current statement",
        "beach hazards statement",
        "gale watch",
        "winter storm watch",
        "hazardous seas watch",
        "heavy freezing spray watch",
        "coastal flood watch",
        "lakeshore flood watch",
        "flood watch",
        "high wind watch",
        "excessive heat watch",
        "extreme cold watch",
        "wind chill watch",
        "lake effect snow watch",
        "hard freeze watch",
        "freeze watch",
        "fire weather watch",
        "extreme fire danger",
        "911 telephone outage",
        "coastal flood statement",
        "lakeshore flood statement",
        "special weather statement",
        "marine weather statement",
        "air quality alert",
        "air stagnation advisory",
        "hazardous weather outlook",
        "hydrologic outlook",
        "short term forecast",
        "administrative message",
        "test",
        "child abduction emergency",
        "blue alert",
    ];

    public static function sort($alerts)
    {
        usort($alerts, function ($a, $b) {
            $priorityA = array_search(strtolower($a->event), self::$priorities);
            $priorityB = array_search(strtolower($b->event), self::$priorities);

            // If the two alerts are of different types, we sort them according
            // to NWS priorities.
            if ($priorityA < $priorityB) {
                return -1;
            }
            if ($priorityB < $priorityA) {
                return 1;
            }

            // If they are of the same type, then we sort them by onset.
            if ($a->onset < $b->onset) {
                return -1;
            }
            if ($b->onset < $a->onset) {
                return 1;
            }
            return 0;
        });

        return $alerts;
    }
}
