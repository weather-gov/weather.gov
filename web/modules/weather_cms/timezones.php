<?php

namespace Drupal\weather_cms\Timezones;

/**
 * Abbreviations of DateTimeZone instances
 * that cover the US and territories, mapped
 * to longer names we have take from NIST at
 * time.gov
 */
$ABBREVS_TO_LONGNAME = [
    "UTC" => "Universal Coordinated Time (UTC)",
    "AKDT" => "Alaska Daylight Time",
    "AKST" => "Alaska Standard Time",
    "HDT" => "Hawaii–Aleutian Daylight Time",
    "HST" => "Hawaii–Aleutian Standard Time",
    "MDT" => "Mountain Daylight Time",
    "MST" => "Mountain Standard Time",
    "CDT" => "Central Daylight Time",
    "CST" => "Central Standard Time",
    "EDT" => "Eastern Daylight Time",
    "EST" => "Eastern Standard Time",
    "PDT" => "Pacific Daylight Time",
    "PST" => "Pacific Standard Time",
    "ChST" =>  "Chamorro Standard Time (Guam)",
    "SST" => "Samoa Standard Time"
];

/**
 * Drupal DateTimeZone id names that are each
 * an example from the given timezones we care
 * about for the US and its territories.
 * Each of these will map to one of the
 * ABBREVS_TO_LONGNAME zones (with variations
 * for Daylight/Standard time as needed)
 */
$US_TIMEZONE_IDS = [
    "UTC",
    "Pacific/Pago_Pago",
    "Pacific/Saipan",
    "America/Adak",
    "America/Yakutat",
    "America/Denver",
    "America/North_Dakota/New_Salem",
    "America/New_York",
    "America/Los_Angeles",
    "America/Phoenix",
    "Pacific/Honolulu"
];

/**
 * For a given DateTimeZone instance, provide a label
 * string that can be used in a user interface.
 */
function getLabelForTimezone(\DateTimeZone $timezone){
    global $ABBREVS_TO_LONGNAME;
    $abbrev = (new \DateTime("now", $timezone))->format("T");
    if(!array_key_exists($abbrev, $ABBREVS_TO_LONGNAME)){
        return;
    }
    $longname = $ABBREVS_TO_LONGNAME[$abbrev];
    $utc = new \DateTime("now", new \DateTimeZone("UTC"));
    if($abbrev == "UTC"){
        return $longname;
    }
    $offset = "";
    $offsetInt = (($timezone->getOffset($utc) / 60) / 60);
    $prefix = "+";
    if($offsetInt < 0){
        $prefix = "";
    }
    $offset = "UTC " . $prefix . $offsetInt;
    return $longname . " (" . $offset . ")";
}

/**
 * Return an associative array that maps
 * PHP timezone ids to custom labels that
 * can be used in a user interface
 */
function getTimezoneIdsToLabels(){
    global $US_TIMEZONE_IDS;
    $sorted_timezones = 
    $result = [];
    foreach($US_TIMEZONE_IDS as $timezone_id){
        $timezone = new \DateTimeZone($timezone_id);
        $label = getLabelForTimezone($timezone);
        $result[$timezone_id] = $label;
    }

    return $result;
}
