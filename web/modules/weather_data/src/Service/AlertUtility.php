<?php

namespace Drupal\weather_data\Service;

class AlertUtility
{
    private const ALERT_KIND = [
        "ALERT_KIND_LAND" => "land",
        "ALERT_KIND_MARINE" => "marine",
        "ALERT_KIND_OTHER" => "other",
    ];

    private const ALERT_LEVEL = [
        "ALERT_LEVEL_WARNING" => [
            "priority" => 0,
            "text" => "warning",
        ],

        "ALERT_LEVEL_WATCH" => [
            "priority" => 128,
            "text" => "watch",
        ],

        "ALERT_LEVEL_OTHER" => [
            "priority" => 2048,
            "text" => "other",
        ],
    ];

    private const ALERT_TYPES = [
        // Priorities are spaced at intervals of powers of two so that new
        // alerts can be inserted exactly in the middle of any existing alerts
        // without needing to reorder all of the other alerts.
        "tsunami warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 0,
        ],
        "tornado warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 1024,
        ],
        "extreme wind warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 2048,
        ],
        "severe thunderstorm warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 3072,
        ],
        "flash flood warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 4096,
        ],
        "flash flood statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 5120,
        ],
        "severe weather statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 6144,
        ],
        "shelter in place warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 7168,
        ],
        "evacuation immediate" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 8192,
        ],
        "civil danger warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 9216,
        ],
        "nuclear power plant warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 10240,
        ],
        "radiological hazard warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 11264,
        ],
        "hazardous materials warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 12288,
        ],
        "fire warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 13312,
        ],
        "civil emergency message" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 14336,
        ],
        "law enforcement warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 15360,
        ],
        "storm surge warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 16384,
        ],
        "hurricane force wind warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 17408,
        ],
        "hurricane warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 18432,
        ],
        "typhoon warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 19456,
        ],
        "special marine warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 20480,
        ],
        "blizzard warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 21504,
        ],
        "snow squall warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 22528,
        ],
        "ice storm warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 23552,
        ],
        "winter storm warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 24576,
        ],
        "high wind warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 25600,
        ],
        "tropical storm warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 26624,
        ],
        "storm warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 27648,
        ],
        "tsunami advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 28672,
        ],
        "tsunami watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 29696,
        ],
        "avalanche warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 30720,
        ],
        "earthquake warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 31744,
        ],
        "volcano warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 32768,
        ],
        "ashfall warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 33792,
        ],
        "coastal flood warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 34816,
        ],
        "lakeshore flood warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 35840,
        ],
        "flood warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 36864,
        ],
        "high surf warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 37888,
        ],
        "dust storm warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 38912,
        ],
        "blowing dust warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_OTHER",
            "priority" => 39936,
        ],
        "lake effect snow warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 40960,
        ],
        "excessive heat warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 41984,
        ],
        "tornado watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 43008,
        ],
        "severe thunderstorm watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 44032,
        ],
        "flash flood watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 45056,
        ],
        "gale warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 46080,
        ],
        "flood statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 47104,
        ],
        "wind chill warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 48128,
        ],
        "extreme cold warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 49152,
        ],
        "hard freeze warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 50176,
        ],
        "freeze warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 51200,
        ],
        "red flag warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 52224,
        ],
        "storm surge watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 53248,
        ],
        "hurricane watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 54272,
        ],
        "hurricane force wind watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 55296,
        ],
        "typhoon watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 56320,
        ],
        "tropical storm watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 57344,
        ],
        "storm watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 58368,
        ],
        "hurricane local statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 59392,
        ],
        "typhoon local statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 60416,
        ],
        "tropical storm local statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 61440,
        ],
        "tropical depression local statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 62464,
        ],
        "avalanche advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 63488,
        ],
        "winter weather advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 64512,
        ],
        "wind chill advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 65536,
        ],
        "heat advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 66560,
        ],
        "urban and small stream flood advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 67584,
        ],
        "small stream flood advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 68608,
        ],
        "arroyo and small stream flood advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 69632,
        ],
        "flood advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 70656,
        ],
        "hydrologic advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 71680,
        ],
        "lakeshore flood advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 72704,
        ],
        "coastal flood advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 73728,
        ],
        "high surf advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 74752,
        ],
        "heavy freezing spray warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 75776,
        ],
        "dense fog advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 76800,
        ],
        "dense smoke advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 77824,
        ],
        "small craft advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 78848,
        ],
        "brisk wind advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 79872,
        ],
        "hazardous seas warning" => [
            "level" => "ALERT_LEVEL_WARNING",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 80896,
        ],
        "dust advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_OTHER",
            "priority" => 81920,
        ],
        "blowing dust advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 82944,
        ],
        "lake wind advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 83968,
        ],
        "wind advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 84992,
        ],
        "frost advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 86016,
        ],
        "ashfall advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 87040,
        ],
        "freezing fog advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 88064,
        ],
        "freezing spray advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 89088,
        ],
        "low water advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 90112,
        ],
        "local area emergency" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 91136,
        ],
        "avalanche watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 92160,
        ],
        "blizzard watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 93184,
        ],
        "rip current statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 94208,
        ],
        "beach hazards statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 95232,
        ],
        "gale watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 96256,
        ],
        "winter storm watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 97280,
        ],
        "hazardous seas watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 98304,
        ],
        "heavy freezing spray watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 99328,
        ],
        "coastal flood watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 100352,
        ],
        "lakeshore flood watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 101376,
        ],
        "flood watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 102400,
        ],
        "high wind watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 103424,
        ],
        "excessive heat watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 104448,
        ],
        "extreme cold watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 105472,
        ],
        "wind chill watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 106496,
        ],
        "lake effect snow watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 107520,
        ],
        "hard freeze watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 108544,
        ],
        "freeze watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 109568,
        ],
        "fire weather watch" => [
            "level" => "ALERT_LEVEL_WATCH",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 110592,
        ],
        "extreme fire danger" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 111616,
        ],
        "911 telephone outage" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 112640,
        ],
        "coastal flood statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 113664,
        ],
        "lakeshore flood statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 114688,
        ],
        "special weather statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 115712,
        ],
        "marine weather statement" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_MARINE",
            "priority" => 116736,
        ],
        "air quality alert" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 117760,
        ],
        "air stagnation advisory" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 118784,
        ],
        "hazardous weather outlook" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 119808,
        ],
        "hydrologic outlook" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 120832,
        ],
        "short term forecast" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 121856,
        ],
        "administrative message" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 122880,
        ],
        "test" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 123904,
        ],
        "child abduction emergency" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_LAND",
            "priority" => 124928,
        ],
        "blue alert" => [
            "level" => "ALERT_LEVEL_OTHER",
            "kind" => "ALERT_KIND_OTHER",
            "priority" => 125952,
        ],
    ];

    public static function getAlertTypes()
    {
        // Encode and decode so we get a deep clone, preventing anyone from
        // outside of this class from accidentally editing anything here.
        $alertTypes = json_decode(json_encode(self::ALERT_TYPES));

        $output = [];
        foreach ($alertTypes as $alert => $info) {
            $info->alert = $alert;
            $info->kind = self::ALERT_KIND[$info->kind];
            $info->level = self::ALERT_LEVEL[$info->level]["text"];
            $output[] = $info;
        }

        return $output;
    }

    public static function isLandAlert($event)
    {
        $alert = strtolower($event);

        if (array_key_exists($alert, self::ALERT_TYPES)) {
            return self::ALERT_KIND[self::ALERT_TYPES[$alert]["kind"]] ==
                self::ALERT_KIND["ALERT_KIND_LAND"];
        }

        return false;
    }

    public static function isMarineAlert($event)
    {
        $alert = strtolower($event);

        if (array_key_exists($alert, self::ALERT_TYPES)) {
            return self::ALERT_KIND[self::ALERT_TYPES[$alert]["kind"]] ==
                self::ALERT_KIND["ALERT_KIND_MARINE"];
        }

        return false;
    }

    public static function sort($alerts)
    {
        $now = DateTimeUtility::now();

        usort($alerts, function ($a, $b) use ($now) {
            $priorityA = array_key_exists(
                strtolower($a->event),
                self::ALERT_TYPES,
            )
                ? self::ALERT_TYPES[strtolower($a->event)]["priority"]
                : INF;

            $priorityB = array_key_exists(
                strtolower($b->event),
                self::ALERT_TYPES,
            )
                ? self::ALERT_TYPES[strtolower($b->event)]["priority"]
                : INF;

            // If both alerts are currently active, sort them by priority.
            if ($a->onset < $now && $b->onset < $now) {
                // If the two alerts are of different types, we sort them according
                // to NWS priorities.
                if ($priorityA < $priorityB) {
                    return -1;
                }
                if ($priorityB < $priorityA) {
                    return 1;
                }
            }

            // If they start in the future, sort them by onset.
            if ($a->onset < $b->onset) {
                return -1;
            }
            if ($b->onset < $a->onset) {
                return 1;
            }

            // But if they start at the same time in the future, sort by
            // priority.
            if ($priorityA < $priorityB) {
                return -1;
            }
            if ($priorityB < $priorityA) {
                return 1;
            }

            // This covers the weird, extremely unlikely case that two of the
            // same alert start at the same time, and there's nothing to sort
            // them by.
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
        $tomorrow = $now
            ->setTimezone(new \DateTimeZone($alert->timezone))
            ->modify("+1 day")
            ->setTime(0, 0, 0);
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

    public static function getGeometryAsJSON($alert, $dataLayer)
    {
        // If the alert already has a geometry, use it.
        if ($alert->geometry ?? false) {
            return $alert->geometry;
        }

        // Otherwise, we need to derive the geometry from other metadata. Alerts
        // without a geometry should have a list of affected zones, and we can
        // build a geometry off that.
        if (
            property_exists($alert->properties, "affectedZones") &&
            count($alert->properties->affectedZones) > 0
        ) {
            $ids = array_map(function ($zone) {
                return "'$zone'";
            }, $alert->properties->affectedZones);
            $ids = implode(",", $ids);

            $sql = "SELECT ST_ASGEOJSON(
                ST_SIMPLIFY(
                    ST_SRID(
                        ST_COLLECT(shape),
                        0
                    ),
                    0.003
                )
            )
            as shape
                FROM weathergov_geo_zones
                WHERE id IN ($ids)";

            $shape = $dataLayer->databaseFetch($sql);

            if ($shape && property_exists($shape, "shape") && $shape->shape) {
                $polygon = json_decode($shape->shape);

                return $polygon;
            }
        }

        // If an alert doesn't have a geometry or any zones, that's probably
        // a bug. However, if the alert has SAME codes, we can use those to
        // get geometries, too.
        $counties = false;
        if (
            property_exists($alert->properties, "geocode") &&
            property_exists($alert->properties->geocode, "SAME")
        ) {
            $counties = count($alert->properties->geocode->SAME) > 0;
        }

        if ($counties) {
            $fips = array_map(function ($same) {
                return substr($same, 1);
            }, $alert->properties->geocode->SAME);
            $fips = implode(",", $fips);

            $sql = "SELECT ST_ASGEOJSON(
                    ST_SIMPLIFY(
                        ST_SRID(
                            ST_COLLECT(shape),
                            0
                        ),
                        0.003
                    )
                )
                as shape
                    FROM weathergov_geo_counties
                    WHERE countyFips IN ($fips)";

            $shape = $dataLayer->databaseFetch($sql);
            if ($shape && property_exists($shape, "shape") && $shape->shape) {
                $polygon = json_decode($shape->shape);
                return $polygon;
            }
        }

        // If we're here, then we didn't find a polygon, zone, or county for
        // the alert. That's almost certainly a bug.
        return false;
    }

    public static function getPlacesFromAlertDescription($alert)
    {
        $description = $alert->properties->description;
        $matches = [];

        // If the alert description has fine-grained location information, there
        // will be a line that starts with:
        //
        // IN [STATE] THIS [WARNING | WATCH | WHATEVER] INCLUDES 13 COUNTIES
        //
        // So if we have a line that matches, we should try parsing it.
        preg_match(
            "/IN \S+ (THIS|THE NEW) \S+ INCLUDES \d+ COUNTIES$/sim",
            $description,
            $matches,
        );

        if (count($matches) > 0) {
            $startToken = $matches[0];
            $matches = [];

            // Keep track of where the extra location information lives inside
            // the alert description so it's easier to remove it later.
            $startIndex = strpos($description, $startToken);
            $endIndex = $startIndex + strlen($startToken);

            // First get the regions of the covered states. This will be things
            // like "Northwest Nebraska". This will create two matches: one for
            // the entire line and another for just the region area name.
            $countyAreaMatches = [];
            preg_match_all(
                "/IN (.+)\n/",
                $description,
                $countyAreaMatches,
                0,
                $startIndex + strlen($startToken),
            );

            // The match array will have 0 or 2 elements. The 0th and 1th index
            // will refer to the list of lines indicating regions and the list
            // of region names, respectively. If the match array is empty, fall
            // back to counting an empty array to avoid errors.
            $countyAreaCount = count($countyAreaMatches[0] ?? []);

            if ($countyAreaCount > 0) {
                $countyAreas = [];

                for ($i = 0; $i < $countyAreaCount; $i += 1) {
                    // The region description will end with a newline. For
                    // simplicity in the regex later, we'll eat this newline
                    // here.
                    $startToken = trim($countyAreaMatches[0][$i]);
                    $countyArea = $countyAreaMatches[1][$i];

                    // If the alert covers multiple states, we can end up with
                    // several of these "THIS WATCH INCLUDES 42 COUNTIES"
                    // headings. If this is such a thing, then it is not a
                    // county area heading and we can skip it.
                    if (
                        preg_match(
                            "/THIS \S+ INCLUDES \d+ COUNTIES$/",
                            $startToken,
                        ) === 1
                    ) {
                        continue;
                    }

                    // The list of counties begins where the region name is
                    // followed by two newlines and continues until either
                    // another pair of newlines OR the end of the text.
                    $counties = [];
                    preg_match(
                        "/$startToken\n\n([\s\S]+?)(\n\n|$)/si",
                        $description,
                        $counties,
                        0,
                        $startIndex,
                    );

                    // The counties are delimitted by multiple spaces, so replace
                    // 2 or more spaces with a single comma. The county list also
                    // spans multiple lines, so replace newlines with commas as
                    // well. Finally, split the list on commas to get the
                    // individual items.
                    $counties = explode(
                        ",",
                        preg_replace(
                            "/\n/",
                            ",",
                            preg_replace("/\s{2,}/", ",", trim($counties[1])),
                        ),
                    );

                    // Updating the ending index based on the counties we find.
                    // Add two to account for the pair of newlines at the end
                    // of the county list.
                    $lastCounty = $counties[count($counties) - 1];
                    $endIndex =
                        strpos($description, $lastCounty, $endIndex) +
                        strlen($lastCounty) +
                        2;

                    // We only want uppercase words. We don't want to scream at
                    // people. Also take this opportunity to trim off extraneous
                    // whitespace.
                    $countyAreas[] = [
                        "area" => ucwords(strtolower($countyArea)),
                        "counties" => array_map(function ($county) {
                            return ucwords(strtolower(trim($county)));
                        }, $counties),
                    ];
                }

                $cities = [];

                // When there is this particularly formatted location information
                // in the alert description, there is also sometimes a list of
                // cities. So let's look for those, too.
                preg_match(
                    "/this includes the cities of([\s\S]+?)(\n\n|$)/si",
                    $description,
                    $matches,
                    0,
                    $startIndex,
                );

                if (count($matches) > 0) {
                    // The list of cities may be grammatically correct and end
                    // with an "and" before the last item. We don't actually
                    // care about that, so remove it if it's there.
                    $cityList = preg_replace(
                        "/\sand\s/i",
                        "",
                        trim($matches[1]),
                    );

                    // Cites are delimitted by commas and a single city can span
                    // multiple lines (like "St. Louis" where perhaps the "St."
                    // is on one line and "Louis" is on the other). So, replace
                    // newlines with spaces.
                    $cityList = preg_replace("/\n/", " ", $cityList);

                    // Now split the list on commas.
                    $cityList = explode(",", str_replace(".", "", $cityList));

                    // Move the ending index again. Still account for the two
                    // newlines at the end of the city list.
                    $lastCity = $cityList[count($cityList) - 1];
                    $endIndex =
                        strpos($description, $lastCity, $endIndex) +
                        strlen($lastCity) +
                        2;

                    // And now format it.
                    $cities = array_map(function ($city) {
                        return ucwords(strtolower(trim($city)));
                    }, $cityList);
                }

                $areas = ["countyAreas" => $countyAreas];
                if (count($cities) > 0) {
                    $areas["cities"] = $cities;
                }

                // Build a new description string that strips out this extra
                // location information since we've now separated it.
                $newDescription =
                    substr($description, 0, $startIndex) .
                    substr($description, $endIndex);

                // Return both things.
                return [$areas, $newDescription];
            }
        }

        // If we're here, we don't recognize any special location information,
        // so return false so we don't do any other processing elsewhere.
        return false;
    }

    /* Determine the "level" of the alert (warning, watch, advisory, etc..)
     * based on the the last word in the alert event name
     * */
    public static function getAlertLevel($event)
    {
        $alert = strtolower($event);
        if (array_key_exists($alert, self::ALERT_TYPES)) {
            $levelKey = self::ALERT_TYPES[$alert]["level"];
            return self::ALERT_LEVEL[$levelKey]["text"];
        }
        return self::ALERT_LEVEL["ALERT_LEVEL_OTHER"]["text"];
    }

    /* Determine the highest alert level from an array of alerts.
     * Warnings are highest, followed by Watches, and anything else is last ("other").
     * */
    public static function getHighestAlertLevel($alerts)
    {
        if (count($alerts) == 0) {
            return "";
        }
        $highestAlertLevel = self::ALERT_LEVEL["ALERT_LEVEL_OTHER"];

        foreach ($alerts as $alert) {
            $event = strtolower($alert->event);
            if (array_key_exists($event, self::ALERT_TYPES)) {
                $levelKey = self::ALERT_TYPES[$event]["level"];
                $level = self::ALERT_LEVEL[$levelKey];

                if ($level["priority"] < $highestAlertLevel["priority"]) {
                    $highestAlertLevel = $level;
                }
            }
        }
        return $highestAlertLevel["text"];
    }
}
