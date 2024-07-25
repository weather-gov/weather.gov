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
        "evacuation immediate",
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
        $now = DateTimeUtility::now();

        usort($alerts, function ($a, $b) use ($now) {
            $priorityA = array_search(strtolower($a->event), self::$priorities);
            $priorityB = array_search(strtolower($b->event), self::$priorities);

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

        $geometries = [];

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

            $shapes = $dataLayer->databaseFetchAll(
                "SELECT ST_AsWKT(shape) as shape
                    FROM weathergov_geo_zones
                    WHERE id IN ($ids)",
            );

            foreach ($shapes as $shape) {
                $geometries[] = $shape;
            }
        }

        if (count($geometries) == 0) {
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

                $shapes = $dataLayer->databaseFetchAll(
                    "SELECT ST_AsWKT(shape) as shape
                        FROM weathergov_geo_counties
                        WHERE countyFips IN ($fips)",
                );

                foreach ($shapes as $shape) {
                    $geometries[] = $shape;
                }
            }
        }

        $polygon = "";

        if (count($geometries) > 0) {
            $polygon = array_pop($geometries)->shape;

            foreach ($geometries as $geometry) {
                $union = $dataLayer->databaseFetch(
                    "SELECT ST_AsWKT(
                        ST_UNION(
                            ST_GEOMFROMTEXT('$polygon'),
                            ST_GEOMFROMTEXT('$geometry->shape')
                        )
                    ) as shape",
                );
                $polygon = $union->shape;
            }

            $polygon = $dataLayer->databaseFetch(
                "SELECT ST_ASGEOJSON(
                    ST_SIMPLIFY(
                        ST_GEOMFROMTEXT('$polygon'),
                        0.003
                    )
                ) as shape",
            );

            $polygon = json_decode($polygon->shape);

            if ($polygon->type == "GeometryCollection") {
                foreach ($polygon->geometries as $innerPolygon) {
                    $innerPolygon->coordinates = SpatialUtility::swapLatLon(
                        $innerPolygon->coordinates,
                    );
                }
            } else {
                $polygon->coordinates = SpatialUtility::swapLatLon(
                    $polygon->coordinates,
                );
            }
        }

        return $polygon;
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
            "/IN \S+ THIS \S+ INCLUDES \d+ COUNTIES$/sim",
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
        $eventWords = explode(" ", $event);
        $alertLevel = strtolower($eventWords[array_key_last($eventWords)]);
        return $alertLevel;
    }

    /* Determine the highest alert level from an array of alerts.
     * Warnings are highest, followed by Watches, and anything else is last ("other").
     * */
    public static function getHighestAlertLevel($alerts)
    {
        if (count($alerts) == 0) {
            return "";
        }
        $highestAlertLevel = "other";
        foreach ($alerts as $alert) {
            if ($alert->alertLevel == "warning") {
                $highestAlertLevel = "warning";
                break;
            } elseif ($alert->alertLevel == "watch") {
                $highestAlertLevel = "watch";
            }
        }
        return $highestAlertLevel;
    }
}
