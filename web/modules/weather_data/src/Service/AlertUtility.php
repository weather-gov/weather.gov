<?php

namespace Drupal\weather_data\Service;

class AlertUtility
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

    private static $landAlerts = [
        "tsunami warning",
        "tornado warning",
        "extreme wind warning",
        "severe thunderstorm warning",
        "flash flood warning",
        "flash flood statement",
        "severe weather statement",
        "shelter in place warning",
        "evacuation - immediate",
        "civil danger warning",
        "nuclear power plant warning",
        "radiological hazard warning",
        "hazardous materials warning",
        "fire warning",
        "civil emergency message",
        "law enforcement warning",
        "hurricane warning",
        "typhoon warning",
        "blizzard warning",
        "snow squall warning",
        "ice storm warning",
        "winter storm warning",
        "high wind warning",
        "tropical storm warning",
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
        "lake effect snow warning",
        "excessive heat warning",
        "dust storm warning",
        "tornado watch",
        "severe thunderstorm watch",
        "flash flood watch",
        "flood statement",
        "wind chill warning",
        "extreme cold warning",
        "hard freeze warning",
        "freeze warning",
        "red flag warning",
        "hurricane watch",
        "typhoon watch",
        "tropical storm watch",
        "hurricane local statement",
        "typhoon local statement",
        "tropical storm local statement",
        "tropical depression local statement",
        "avalanche advisory",
        "freezing rain advisory",
        "winter weather advisory",
        "lake effect snow advisory",
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
        "dense fog advisory",
        "dense smoke advisory",
        "lake wind advisory",
        "wind advisory",
        "blowing dust advisory",
        "frost advisory",
        "ashfall advisory",
        "freezing fog advisory",
        "local area emergency",
        "child abduction emergency",
        "avalanche watch",
        "blizzard watch",
        "rip current statement",
        "beach hazards statement",
        "winter storm watch",
        "coastal flood watch",
        "lakeshore flood watch",
        "flood watch",
        "high wind watch",
        "excessive heat watch",
        "extreme cold watch",
        "wind chill watch",
        "lake effect snow watch",
        "freeze watch",
        "fire weather watch",
        "extreme fire danger",
        "911 telephone outage",
        "coastal flood statement",
        "lakeshore flood statement",
        "special weather statement",
        "air quality alert",
        "air stagnation advisory",
        "hazardous weather outlook",
        "hydrologic outlook",
        "short term forecast",
        "administrative message",
        "test",
    ];

    public static function isMarineAlert($event)
    {
        return array_search(strtolower($event), self::$landAlerts) === false;
    }

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

    /**
     * Given an alert object, compute the endTime.
     *
     * Note that we select the `ends` field first.
     * If null, we try the `expires` field.
     * If both are null, return false.
     */
    public static function getEndTime($alert)
    {
        // We need to determine the correct ends field.
        // If there is no value for the ends, then we use
        // expires. If there is in that case no value for expires,
        // then we do nothing and continue to the next alert,
        // ignoring this one.
        $field = $alert->endsRaw;
        if (!$field) {
            $field = $alert->expiresRaw;
        }
        if (!$field) {
            return false;
        }

        return DateTimeUtility::stringToDate($field, $alert->timezone);
    }

    public static function getDurationText($alert, $now)
    {
        $tomorrow = $now->modify("+1 day")->setTime(0, 0, 0);
        $later = $tomorrow->modify("+1 day")->setTime(0, 0, 0);

        if ($alert->onset <= $now) {
            // The event has already begun. Now we need to see if we know
            // when it ends.
            $ends = self::getEndTime($alert);
            if ($ends) {
                if ($ends >= $now) {
                    // We are currently in the middle of the event.
                    if ($ends < $tomorrow) {
                        // It ends today
                        return "until " . $ends->format("g:i A") . " today";
                    } else {
                        return "until " . $ends->format("l m/d g:i A T");
                    }
                } else {
                    // The event has already concluded. We shouldn't be
                    // showing this alert at all.
                    return "has concluded";
                }
            } else {
                // This alert has no ending or expiration time. This is a
                // weird scenario, but we should handle it just in case.
                return "is in effect";
            }
        } elseif ($alert->onset > $now) {
            // The event is in the future.
            $onsetHour = $alert->onset->format("H");

            if ($alert->onset < $tomorrow) {
                // The event starts later today.
                if ($onsetHour < 12) {
                    return "this morning";
                } elseif ($onsetHour < 18) {
                    return "this afternoon";
                } else {
                    return "tonight";
                }
            } elseif ($alert->onset < $later) {
                // The event starts tomorrow
                if ($onsetHour < 12) {
                    return "tomorrow morning";
                } elseif ($onsetHour < 18) {
                    return "tomorrow afternoon";
                } else {
                    return "tomorrow night";
                }
            } else {
                // The event starts in the further future
                return $alert->onset->format("l");
            }
        }
    }
}
