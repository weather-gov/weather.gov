import logging
from datetime import datetime

from django.shortcuts import get_object_or_404
from django.utils.safestring import mark_safe
from html_sanitizer import Sanitizer

from backend.interop import get_weather_stories
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


def get_states_combo_box_list():
    """Get a list of dictionaries of WeatherState 'text' and 'value' keys for use in wx-combo-box."""
    result = []
    for state in WeatherStates.objects.order_by("name").only("name", "fips"):
        result.append(  #  noqa: PERF401
            {
                "text": state.name,
                "value": state.fips,
            },
        )

    return result


def get_counties_combo_box_list(state_fips):
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


def get_county_weather_stories(wfos, time_zone_info):
    """Fetch and process weather story data for a county/timezone."""
    valid = []
    errors = []
    empties = []
    for wfo in wfos:
        weather_story_data = get_weather_stories(wfo.code.upper())
        if weather_story_data and "error" not in weather_story_data:
            weather_story_data["wfo_url"] = wfo.url
            weather_story_data["wfo_name"] = wfo.name
            weather_story_data["startTime"] = datetime.fromisoformat(
                weather_story_data["startTime"]
            ).astimezone(tz=time_zone_info)
            weather_story_data["updateTime"] = datetime.fromisoformat(
                weather_story_data["updateTime"]
            ).astimezone(tz=time_zone_info)
            weather_story_data["endTime"] = datetime.fromisoformat(
                weather_story_data["endTime"]
            ).astimezone(tz=time_zone_info)
            valid.append(weather_story_data)
        elif weather_story_data:
            # In this case, there is an error on the dict.
            # We pass this to the template as-is to handle
            # the error case
            weather_story_data["wfo_url"] = wfo.url
            weather_story_data["wfo_name"] = wfo.name
            errors.append(weather_story_data)
        else:
            # In this case, the interop function returned
            # None for the given WFO, meaning there are no
            # current weather stories there.
            # We still return a dict, but only with an officeId,
            # so that we can render the AFD links as needed.
            empties.append({
                "officeId": wfo.code.upper(),
                "wfo_url": wfo.url,
                "wfo_name": wfo.name,
                "is_empty": True
            })

    valid = sorted(valid, key=lambda story: story["startTime"], reverse=True)
    return valid + empties + errors
