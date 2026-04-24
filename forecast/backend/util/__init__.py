import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Tuple
from zoneinfo import ZoneInfo

from django.shortcuts import get_object_or_404
from django.utils.safestring import mark_safe
from django.utils.translation import gettext as _
from html_sanitizer import Sanitizer

from backend.models import WFO, HazardousWeatherOutlookMetadata
from spatial.models import WeatherCounties, WeatherStates

OCONUS_4CODE_MAPPINGS = {
    "PHFO": "HFO",  # Honolulu, HI
    "TJSJ": "SJU",  # San Juan, PR
    "NSTU": "PPG",  # Pago Pago, AS
    "PGUM": "GUM",  # Tiyan, GU
    "PAFC": "AFC",  # Anchorage, AK
    "PAFG": "AFG",  # Fairbanks, AK
    "PAJK": "AJK",  # Juneau, AK
}

ALERT_PRIORITY_MAP = {
    "tsunami warning": 10,
    "tornado warning": 20,
    "extreme wind warning": 30,
    "severe thunderstorm warning": 40,
    "flash flood warning": 50,
    "flash flood statement": 60,
    "severe weather statement": 70,
    "shelter in place warning": 80,
    "evacuation immediate": 90,
    "civil danger warning": 100,
    "nuclear power plant warning": 110,
    "radiological hazard warning": 120,
    "hazardous materials warning": 130,
    "fire warning": 140,
    "civil emergency message": 150,
    "law enforcement warning": 160,
    "storm surge warning": 170,
    "hurricane force wind warning": 180,
    "hurricane warning": 190,
    "typhoon warning": 200,
    "special marine warning": 210,
    "blizzard warning": 220,
    "snow squall warning": 230,
    "ice storm warning": 240,
    "heavy freezing spray warning": 250,
    "winter storm warning": 260,
    "lake effect snow warning": 270,
    "dust storm warning": 280,
    "blowing dust warning": 290,
    "high wind warning": 300,
    "tropical storm warning": 310,
    "storm warning": 320,
    "tsunami advisory": 330,
    "tsunami watch": 340,
    "avalanche warning": 350,
    "earthquake warning": 360,
    "volcano warning": 370,
    "ashfall warning": 380,
    "flood warning": 390,
    "coastal flood warning": 400,
    "lakeshore flood warning": 410,
    "ashfall advisory": 420,
    "high surf warning": 430,
    "extreme heat warning": 440,
    "tornado watch": 450,
    "severe thunderstorm watch": 460,
    "flash flood watch": 470,
    "gale warning": 480,
    "flood statement": 490,
    "extreme cold warning": 500,
    "freeze warning": 510,
    "red flag warning": 520,
    "storm surge watch": 530,
    "hurricane watch": 540,
    "hurricane force wind watch": 550,
    "typhoon watch": 560,
    "tropical storm watch": 570,
    "storm watch": 580,
    "tropical cyclone local statement": 590,
    "winter weather advisory": 600,
    "avalanche advisory": 610,
    "cold weather advisory": 620,
    "heat advisory": 630,
    "flood advisory": 640,
    "coastal flood advisory": 650,
    "lakeshore flood advisory": 660,
    "high surf advisory": 670,
    "dense fog advisory": 680,
    "dense smoke advisory": 690,
    "small craft advisory": 700,
    "brisk wind advisory": 710,
    "hazardous seas warning": 720,
    "dust advisory": 730,
    "blowing dust advisory": 740,
    "lake wind advisory": 750,
    "wind advisory": 760,
    "frost advisory": 770,
    "freezing fog advisory": 780,
    "freezing spray advisory": 790,
    "low water advisory": 800,
    "local area emergency": 810,
    "winter storm watch": 820,
    "rip current statement": 830,
    "beach hazards statement": 840,
    "gale watch": 850,
    "avalanche watch": 860,
    "hazardous seas watch": 870,
    "heavy freezing spray watch": 880,
    "flood watch": 890,
    "coastal flood watch": 900,
    "lakeshore flood watch": 910,
    "high wind watch": 920,
    "extreme heat watch": 930,
    "extreme cold watch": 940,
    "freeze watch": 950,
    "fire weather watch": 960,
    "extreme fire danger": 970,
    "911 telephone outage": 980,
    "coastal flood statement": 990,
    "lakeshore flood statement": 1000,
    "special weather statement": 1010,
    "marine weather statement": 1020,
    "air quality alert": 1030,
    "air stagnation advisory": 1040,
    "hazardous weather outlook": 1050,
    "hydrologic outlook": 1060,
    "short term forecast": 1070,
    "administrative message": 1080,
    "test": 1090,
    "child abduction emergency": 1100,
    "blue alert": 1110,
}


DAY_TRANSLATION_MAP = {
    "Monday": _("county.alert-tabs.day.Monday.01"),
    "Tuesday": _("county.alert-tabs.day.Tuesday.01"),
    "Wednesday": _("county.alert-tabs.day.Wednesday.01"),
    "Thursday": _("county.alert-tabs.day.Thursday.01"),
    "Friday": _("county.alert-tabs.day.Friday.01"),
    "Saturday": _("county.alert-tabs.day.Saturday.01"),
    "Sunday": _("county.alert-tabs.day.Sunday.01"),
    "Today": _("county.alert-tabs.day.all.01"),
}


def get_wfo_from_afd(afd):
    """
    Determine the correct WFO code for an AFD.

    Args:
        afd: a parsed JSON dict of AFD product information
    """
    if not afd or "issuingOffice" not in afd:
        return None

    # AFD issuing offices uses the FAA 4-letter international code.
    # For CONUS WFOs, the FAA code is the WFO code with a preceding
    # 'K', so if the code starts with K, we can just strip it off
    raw_office_code = afd["issuingOffice"].upper()
    if raw_office_code.startswith("K"):
        return raw_office_code[1:]

    # For OCONUS, the codes do not always map so clearly.
    # There are only nine OCONUS FAA codes used by AFDs,
    # so we can just special case them
    if raw_office_code in OCONUS_4CODE_MAPPINGS:
        return OCONUS_4CODE_MAPPINGS[raw_office_code]

    # If we get here, we don't recognize the given WFO code as
    # valid, so return None
    return None


def mark_safer(value, transformer=None, **kwargs):
    """
    Mark safe, more safely.

    This puts `value` through an HTML sanitizer that will strip out
    many XSS attack vectors before passing it to Django's `mark_safe`.

    Use this instead of django.utils.safestring.mark_safe.

    Structural tags like meta, title, html will always be removed. Sorry.

    Args:
        value: A string to be sanitized and marked safe
            for inclusion in templates

        transformer (optional): A function to modify `value` before
            it is passed to `mark_safe`.

            Example:
            mark_safer(value, lambda cleaned: re.sub("one", "two", cleaned))

    Keyword args:
        tag (optional): A set of tags which will replace the defaults;
            it may cause errors if too restrictive
        extra_tag (optional): A set of tags which will be added to the defaults
        attributes (optional): A dictionary of allowed attributes by tag
    """
    tags = (
        set(kwargs["tag"])
        if "tag" in kwargs
        else {"a", "h1", "h2", "h3", "time", "strong", "em", "p", "ul", "ol", "li", "br", "sub", "sup", "hr", "span"}
    )

    if "extra_tag" in kwargs:
        tags = tags.union(set(kwargs["extra_tag"]))

    attributes = (
        kwargs["attributes"]
        if "attributes" in kwargs
        else {
            "a": ("href", "name", "target", "title", "id", "rel", "class"),
            "strong": ("class",),
            "span": ("class",),
            "time": ("datetime",),
        }
    )

    sanitizer = Sanitizer(
        {
            # don't remove stuff like '\n'
            "keep_typographic_whitespace": True,
            "tags": tags,
            "attributes": attributes,
        },
    )
    cleaned = sanitizer.sanitize(value)

    if callable(transformer):
        return mark_safe(transformer(cleaned))  # noqa: S308
    return mark_safe(cleaned)  # noqa: S308


def timestamps_to_datetime_in_dict(dictionary, keys, timezoneinfo):
    """
    Modify a dict containing string ISO timestamps to be datetime objects.

    For a dictionary and a list of keys that map to ISO timestamps in that
    dictionary, and an object representing timezone information, modify
    the values at each of the keys to be parsed and zoned datetime objects
    """
    if dictionary:
        for key in keys:
            dictionary[key] = datetime.fromisoformat(dictionary[key]).astimezone(tz=timezoneinfo)


def get_states_combo_box_list(selected_fips=""):
    """Get a list of dictionaries of WeatherState 'text' and 'value' keys for use in wx-combo-box."""
    result = []
    for state in WeatherStates.objects.order_by("name").only("name", "fips"):
        result.append(  #  noqa: PERF401
            {
                "text": state.name,
                "value": state.fips,
                "selected": selected_fips == state.fips,
            },
        )

    return result


def get_counties_combo_box_list(state_fips, selected_fips=""):
    """Get a list of dictionaries of WeatherCounties for the given state.

    The dicts will have'text' and 'value' keys for use in wx-combo-box.
    """
    result = []
    for county in (
        WeatherCounties.objects.filter(state__fips=state_fips)
        .select_related("state")
        .order_by("countyname")
        .only("countyname", "countyfips", "state__state")
    ):
        result.append(  #  noqa: PERF401
            {
                "text": f"{county.countyname}, {county.state.state}",
                "value": county.countyfips,
                "selected": selected_fips == county.countyfips,
            },
        )

    return result


def disable_logging_for_quieter_tests(func):
    """
    Turn off logging when console error output is expected.

    This is a decorator to be used with tests. Do not use on real code.
    """

    def wrapper(*args, **kwargs):
        """Disable, then reenable, logging."""
        logging.disable(logging.CRITICAL)
        func(*args, **kwargs)
        logging.disable(logging.NOTSET)
        return func

    return wrapper


def get_basis_for_ghwo_risk(wfo_code, risk_type):
    """Return the basis description for a risk type."""
    basis_description = None
    wfo = get_object_or_404(WFO.objects.select_related(), code=wfo_code.upper())

    metadata = HazardousWeatherOutlookMetadata.objects.filter(type=risk_type, wfo=wfo).first()
    if metadata:
        basis_description = metadata.basis

    if not basis_description:
        defaults = HazardousWeatherOutlookMetadata.objects.filter(type=risk_type, wfo=None).first()
        if defaults:
            basis_description = defaults.basis

    return basis_description


def get_ghwo_daily_images(county_ghwo_data):
    """
    Return a list of unique image urls present in the ghwo data.

    We want to have only single instances of a url, and only
    for days where the corresponding risk factor level is
    greater than zero.
    These are indended for use so we can prefetch images
    with link tags in the document header.
    """
    urls = set()
    for risk in county_ghwo_data["risks"].values():
        for day in risk["days"]:
            if day["category"] > 0 and "image" in day:
                urls.add(day["image"])

    return list(urls)


def sort_alert_key(alert: dict) -> Tuple[int, str]:
    """
    Return a sorting key based on Priority Map and Onset Time.

    Primary sort uses ALERT_PRIORITY_MAP
    Secondary sort uses onset time for timebreaking
    """
    event_name = alert.get("event", "test").lower()
    priority = ALERT_PRIORITY_MAP.get(event_name, 9999)
    # Extract severity text, defaulting to 'other' (lowest priority)
    onset = alert.get("onset", "9999-12-31T23:59:59Z")
    return (priority, onset)


def process_county_alerts(alert_items: list) -> list:
    """
    Sort and enhance alert items with unique display titles.

    This function deduplicates alert objects by:
    Reordering items based on priority rankings
    Calculating daily totals per event type to determine if indexing is needed
    """
    # Deduplicate by Hash, some alerts are the same
    unique_map = {}
    for alert in alert_items:
        h = alert.get("hash")
        # Only keep the first time we see this specific hash
        if h not in unique_map:
            unique_map[h] = alert

    deduplicated_list = list(unique_map.values())

    # Primary sort, organize by priority, then chronologically
    sorted_items = sorted(deduplicated_list, key=sort_alert_key)

    # Count total occurrences for each event + day combo
    totals = defaultdict(int)
    for alert in sorted_items:
        # Extract day name as the 'key' for counting
        # Format expected, "Wednesday 02/11 9:00 AM PST" -> "Wednesday"
        full_start = alert.get("timing", {}).get("start", "")
        day_raw = full_start.split(" ")[0] if full_start else DAY_TRANSLATION_MAP["Today"]
        totals[f"{alert.get('event', 'Alert')}-{day_raw}"] += 1

    # Construct the final display strings
    occurrences = defaultdict(int)
    for alert in sorted_items:
        event_type = alert.get("event", "Alert")

        # Sanitize the hash for HTML
        # Remove non-alphanumeric characters
        raw_hash = alert.get("hash", "")
        safe_hash = re.sub(r"[^a-zA-Z0-9]", "", raw_hash)
        alert["unique_id"] = f"hash_{safe_hash}"

        # Parsing day name, format assumed: "Wednesday 02/11 9:00 AM PST"
        full_start = alert.get("timing", {}).get("start", "")
        day_raw = full_start.split(" ")[0] if full_start else DAY_TRANSLATION_MAP["Today"]

        # Construct a unique key that's readable and used in UI code for events
        lookup_key = f"{event_type}-{day_raw}"
        occurrences[lookup_key] += 1

        # Use the  map to get the translated day name.
        day_translated = DAY_TRANSLATION_MAP.get(day_raw, day_raw)

        # Get the translated day name
        if totals[lookup_key] > 1:
            format_string = _("alerts.titles.with-index.01")
            alert["display_title"] = format_string % {
                "event": event_type,
                "day": day_translated,
                "index": occurrences[lookup_key],
            }
        else:
            format_string = _("alerts.titles.without-index.01")
            alert["display_title"] = format_string % {"event": event_type, "day": day_translated}

    return sorted_items


def process_state_alerts(alert_geojsons: list, state_timezone: str = "UTC") -> list:
    """Process state alerts, sorting and returning valid geojson objects."""
    tz = ZoneInfo(state_timezone)
    today_start = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)

    # Pre-calculate day ranges to avoid doing it inside the feature loop
    days = [(today_start + timedelta(days=i), today_start + timedelta(days=i + 1)) for i in range(5)]

    unique_map = {}
    for feature in alert_geojsons:
        aj = feature["properties"]["alertjson"]
        h = aj.get("hash")
        if h not in unique_map:
            onset_dt = datetime.fromisoformat(aj["onset"].replace("Z", "+00:00")).astimezone(tz)
            finish_raw = aj.get("finish") or aj.get("ends")
            finish_dt = datetime.fromisoformat(finish_raw.replace("Z", "+00:00")).astimezone(tz) if finish_raw else None

            # Store these on the dict temporarily for the next steps
            aj["_onset_dt"] = onset_dt
            aj["_finish_dt"] = finish_dt

            # Determine day_raw once
            if onset_dt.date() == today_start.date():
                aj["_day_raw"] = "Today"
            else:
                aj["_day_raw"] = onset_dt.strftime("%A")

            aj["alertDays"] = []
            unique_map[h] = feature

    sorted_features = sorted(unique_map.values(), key=lambda x: sort_alert_key(x["properties"]["alertjson"]))

    # Timeline Logic (Using pre-parsed dates)
    for i, (d_start, d_end) in enumerate(days):
        for feature in sorted_features:
            aj = feature["properties"]["alertjson"]
            if aj["_onset_dt"] < d_end and (aj["_finish_dt"] is None or aj["_finish_dt"] >= d_start):
                aj["alertDays"].append(i + 1)

    # Count totals for indexing (Using pre-determined _day_raw)
    totals = defaultdict(int)
    for feature in sorted_features:
        aj = feature["properties"]["alertjson"]
        totals[f"{aj.get('event', 'Alert')}-{aj['_day_raw']}"] += 1

    # Final Loop: Unique ID and Display Title
    occurrences = defaultdict(int)
    for feature in sorted_features:
        aj = feature["properties"]["alertjson"]
        event_type = aj.get("event", "Alert")
        day_raw = aj["_day_raw"]

        # Set unique_id
        raw_hash = aj.get("hash", "")
        aj["unique_id"] = f"hash_{re.sub(r'[^a-zA-Z0-9]', '', raw_hash)}"

        lookup_key = f"{event_type}-{day_raw}"
        occurrences[lookup_key] += 1
        day_translated = DAY_TRANSLATION_MAP.get(day_raw, day_raw)

        # Apply display title
        if totals[lookup_key] > 1:
            format_string = _("alerts.titles.with-index.01")
            aj["display_title"] = format_string % {
                "event": event_type,
                "day": day_translated,
                "index": occurrences[lookup_key],
            }
        else:
            format_string = _("alerts.titles.without-index.01")
            aj["display_title"] = format_string % {"event": event_type, "day": day_translated}

        # Clean up temporary keys so they don't end up in the JSON output
        del aj["_onset_dt"]
        del aj["_finish_dt"]
        del aj["_day_raw"]

    return sorted_features


def format_briefing_timestamps(briefing, wfo_instance, time_zone_info):
    """Format briefing data and timestamps."""
    if briefing and "error" in briefing:
        briefing["wfo_url"] = wfo_instance.url
        briefing["wfo_name"] = wfo_instance.name
        return briefing

    # Briefing objects are returned as a dict with an inner
    # 'breifing' key. This value can be None if there are no
    # briefings for the given location
    briefing_inner = briefing.get("briefing", None)
    if briefing_inner:
        timestamps_to_datetime_in_dict(briefing_inner, ["startTime", "endTime", "updateTime"], time_zone_info)
        briefing_inner["wfo_url"] = wfo_instance.url
        briefing_inner["wfi_name"] = wfo_instance.name

        # If the briefing was updated prior to its start time, we don't
        # care about that update. However, if it was updated after the
        # briefing went live, then we absolutely do care.
        briefing_inner["updateTime"] = max(briefing_inner["updateTime"], briefing_inner["startTime"])
        return briefing_inner
    return briefing


def get_briefings_from_county_data(county_data, wfo_instances, time_zone_info):
    """Pull out and format briefings from county data as returned from the interop."""
    # First, make a lookup dictionary of WFOs to briefing information.
    # Each briefing (that is actually present) should have an officeId key.
    lookup = {}
    for item in county_data["briefings"]:
        if "officeId" in item:
            if "briefing" in item and not item["briefing"]:
                continue
            lookup[item["officeId"]] = item

    # Now using the passed-in WFO instances, perform briefing lookups
    # on the dictionary and format any valid responses.
    result = []
    for wfo in wfo_instances:
        briefing_data = lookup.get(wfo.code.upper(), None)
        if briefing_data:
            result.append(format_briefing_timestamps(briefing_data, wfo, time_zone_info))
    return result


def get_weather_stories_from_county_data(county_data, wfo_instances, time_zone_info):
    """Format weather stories from the county interop data."""
    valid = []
    errors = []
    empties = []

    # First we need to make a small dict that maps the incoming wfo codes
    # (officeIds) to the underlying weather story data.
    lookup = {}
    for story in county_data["weatherstories"]:
        lookup[story["officeId"]] = story

    # Now iterate through our list of relevant wfo model instances
    # using the lookup dict to get any possible weather story data
    for wfo in wfo_instances:
        story_data = lookup.get(wfo.code.upper(), None)
        if story_data and "error" not in story_data:
            story_data["wfo_url"] = wfo.url
            story_data["wfo_name"] = wfo.name
            timestamps_to_datetime_in_dict(story_data, ["startTime", "updateTime", "endTime"], time_zone_info)
            valid.append(story_data)
        elif story_data:
            # In this case, there is an error on the response dict.
            # We pass this to the template as-is to handle
            # the error case
            story_data["wfo_url"] = wfo.url
            story_data["wfo_name"] = wfo.name
            errors.append(story_data)
        else:
            # In this case, there is no weather story data
            # for the given WFO present, meaning there are
            # no current weather stories there.
            # We still return a dict, but only with an officeId,
            # so that we can render the AFD links as needed
            # in the templates
            empties.append({"officeId": wfo.code.upper(), "wfo_url": wfo.url, "wfo_name": wfo.name, "is_empty": True})

    valid = sorted(valid, key=lambda story: story["startTime"], reverse=True)
    return valid + empties + errors


def get_weather_story_from_point_data(point_data, wfo_instance, time_zone_info):
    """Format and return weather story data from point interop response data."""
    story_data = point_data.get("weatherstory", [])
    story = None
    if len(story_data):
        # For now, we only care about the first weather story
        # present in the data.
        story = story_data[0]

    if story and "error" not in story:
        story["wfo_name"] = wfo_instance.name
        story["wfo_url"] = wfo_instance.url
        timestamps_to_datetime_in_dict(story, ["startTime", "updateTime", "endTime"], time_zone_info)
    elif story and "error" in story:
        story["wfo_name"] = wfo_instance.name
        story["wfo_url"] = wfo_instance.url
    else:
        # Then the weather story is empty. We should
        # still provide WFO information in the form of
        # a dict specifying emptiness, so the template
        # can render appropriately
        story = {
            "is_empty": True,
            "officeId": wfo_instance.code,
            "wfo_name": wfo_instance.name,
            "wfo_url": wfo_instance.url,
        }

    return story
