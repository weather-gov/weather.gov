import logging
from datetime import datetime

from django.utils.safestring import mark_safe
from html_sanitizer import Sanitizer

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

def mark_safer(value, transformer=None):
    """
    Mark safe, more safely.

    This puts `value` through an HTML sanitizer that will strip out
    many XSS attack vectors before passing it to Django's `mark_safe`.

    Use this instead of django.utils.safestring.mark_safe.

    Args:
        value: A string to be sanitized and marked safe
            for inclusion in templates

        transformer (optional): A function to modify `value` before
            it is passed to `mark_safe`.

            Example:
            mark_safer(value, lambda cleaned: re.sub("one", "two", cleaned))
    """
    sanitizer = Sanitizer(
        {
            # don't remove stuff like '\n'
            "keep_typographic_whitespace": True,
            "tags": {
                "a", "h1", "h2", "h3", "strong", "em", "p", "ul", "ol",
                "li", "br", "sub", "sup", "hr", "span",
            },
            "attributes": {
                "a": ("href", "name", "target", "title", "id", "rel", "class"),
                "strong": ("class",),
                "span": ("class",),
            },
        },
    )
    cleaned = sanitizer.sanitize(value)

    if callable(transformer):
        return mark_safe(transformer(cleaned))  # noqa: S308
    return mark_safe(cleaned)  # noqa: S308

def get_states_combo_box_list():
    """Get a list of dictionaries of WeatherState 'text' and 'value' keys for use in wx-combo-box."""
    result = []
    for state in WeatherStates.objects.order_by("name"):
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
    for county in WeatherCounties.objects.filter(state__fips=state_fips).order_by("countyname"):
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

def process_ghwo_daily_summary(ghwo_data):
    """Process ghwo data into a form usable by the ghwo daily summary partial."""
    for day in ghwo_data["days"]:

        # We need a datetime object so that the templates
        # can correctly format strings
        day["datetime"] = datetime.fromisoformat(day["timestamp"])

        # The highest level for the day is specified by
        # the value at the 'DailyComposite' key.
        # Set the highest to None where the composite
        # is zero
        highest = {"level": day["DailyComposite"]}
        if highest["level"] == 0:
            highest = None
        day["highest"] = highest

    return ghwo_data

def _temporary_get_metadata_for_ghwo_risk_type(risk_type):
    """
    Return a dict of metadata about the specific risk type.

    Note that this is a temporary placeholder that returrns
    hard-coded values for now. We still need to determine
    how to retrieve, store, and access this metadata
    """
    return {
        "id": risk_type,
        "label": risk_type,
        "description": f"A more verbose description for {risk_type} goes here.",

        # The description is how the given office
        # calculates the specific risk factor
        "basis_description": ("A description of how the local office computes or otherwise " +
                              f"describes the parameters that meet the requirements for {risk_type}."),

        # Each level for this risk type has its own label and description
        "levels": {
            "0": {
                "label": "None",
                "number": 0,
                "description": f"No risk for {risk_type}",
            },
            "1": {
                "label": "Low",
                "number": 1,
                "description": f"Description for low {risk_type} level here",
            },
            "2": {
                "label": "Limited",
                "number": 2,
                "description": f"Description for limited {risk_type} level here",
            },
            "3": {
                "label": "Elevated",
                "number": 3,
                "description": f"Description for elevated {risk_type} level here",
            },
            "4": {
                "label": "Significant",
                "number": 4,
                "description": f"Description for significant {risk_type} level here",
            },
            "5": {
                "label": "Extreme",
                "number": 5,
                "description": f"Description for extreme {risk_type} level here",
            },
        },
    }


def _get_risk_factor_ids(county_ghwo_data):
    """
    Return a list of risk factor key names (ids) for the given county ghwo data.

    GHWO county data is formatted as a set of days, each of which has keys
    for the different risk factors (and a value for the level that day).
    We call these keys the risk_id.
    Not all keys are present across all days, so we need to get the
    'total' set for all the days available and return as a list.
    """
    risk_ids = set()
    for day in county_ghwo_data["days"]:
        for key, level in day.items():
            # All risk_id keys begin with a capital letter.
            # The exception is the 'DailyComposite' key,
            # which represents the highest level for the day.
            # Additionally, we only want to consider risk ids
            # whose value is greater than zero.
            is_risk_id = key[0].isupper() and key != "DailyComposite"
            if is_risk_id and level > 0:
                risk_ids.add(key)

    return list(risk_ids)


def _get_risk_daily_rows(risk_ids, county_ghwo_data):
    """Return a list of dicts, each represending data used to render a table row."""
    result = []
    for risk_id in risk_ids:
        risk = _temporary_get_metadata_for_ghwo_risk_type(risk_id)

        # Get the risk level and other information for each day.
        # These represent the individual cells of the risk details
        # interactive table
        days = []
        for day in county_ghwo_data["days"]:
            if risk_id not in day:
                level = 0
            else:
                level = day[risk_id]

            # Sometimes there is not an image for
            # a given risk factor. We set to None in
            # these cases
            if risk_id in day["images"]:
                image = day["images"][risk_id]
            else:
                image = None

            days.append({
                "level": risk["levels"][str(level)],
                "timestamp": day["timestamp"],
                "datetime": datetime.fromisoformat(day["timestamp"]),
                "day_number": day["dayNumber"],
                "image": image,
            })

        result.append({
            "risk": risk,
            "days": days,
        })
    return result


def _set_first_selected_day(rows):
    """Add is_first to the first 'viable' day in the list of row data.

    The rows are those representing data for rows in the interactive
    table.
    Each row has it's own days list, representing each cell in the row.
    'Viable' here means the first non-level-zero day in the first row.
    """
    for day in rows[0]["days"]:
        if day["level"]["number"] > 0:
            day["is_first"] = True
            break

def process_ghwo_daily_details(county_ghwo_data):
    """Process ghwo data into a form usable by the ghwo daily details partial."""
    # Get a list of risk_ids in this data that have > 0
    # levels at some point throughout the days
    risk_ids = _get_risk_factor_ids(county_ghwo_data)

    # Get a list of dicts contining risk metadata as well
    # as a nested list of daily data for each risk level.
    # This list is represents the rows of the interactive table
    rows = _get_risk_daily_rows(risk_ids, county_ghwo_data)

    # Determine which risk type and day should
    # appear as the first 'selected' one in the table.
    # To signal that it is the first, we set a key on the day
    # dictionary
    _set_first_selected_day(rows)

    return rows


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
    risk_ids = _get_risk_factor_ids(county_ghwo_data)
    for day in county_ghwo_data["days"]:
        # For each of the keys, which are risk_ids,
        # determine if the level for the day is > 0.
        # If so, add the corresponding image url
        # to the set
        for key in risk_ids:
            if key in day["images"] and day[key] > 0:
                urls.add(day["images"][key])

    return list(urls)

