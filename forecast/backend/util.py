import logging
from datetime import datetime

from deepmerge import always_merger
from django.forms.models import model_to_dict
from django.shortcuts import get_object_or_404
from django.utils.safestring import mark_safe
from html_sanitizer import Sanitizer

from backend.models import WFO, HazardousWeatherOutlookLevels, HazardousWeatherOutlookMetadata
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

    Args:
        value: A string to be sanitized and marked safe
            for inclusion in templates

        transformer (optional): A function to modify `value` before
            it is passed to `mark_safe`.

            Example:
            mark_safer(value, lambda cleaned: re.sub("one", "two", cleaned))
    """
    tags = (
        kwargs["tag"]
        if "tag" in kwargs
        else {"a", "h1", "h2", "h3", "time", "strong", "em", "p", "ul", "ol", "li", "br", "sub", "sup", "hr", "span"}
    )

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


def process_ghwo_daily_summary(ghwo_data):
    """Process ghwo data into a form usable by the ghwo daily summary partial."""
    for day in ghwo_data["days"]:
        # The highest level for the day is specified by
        # the value at the 'DailyComposite' key.
        # Set the highest to None where the composite
        # is zero
        highest = {"level": day["composite"]["max"]}
        if highest["level"] == 0:
            highest = None
        day["highest"] = highest

    return ghwo_data


def _get_metadata_for_ghwo_risk_type(wfo_code, risk_type):
    """Return a dict of metadata about the specific risk type."""
    wfo = get_object_or_404(WFO.objects.select_related(), code=wfo_code.upper())

    # Get default hazardous weather metadata for this risk type. Convert it into
    # dict so we can merge it into the gaps of any WFO-specific metadata.
    defaults = HazardousWeatherOutlookMetadata.objects.filter(type=risk_type, wfo=None).first()
    # The labels is kinda funky. The risk type is an enum, but it comes out as
    # a string. However, we can make that enum key into a human-readable string
    # using the name property. So grab that before dict-i-fying. We only need
    # to get the label from the defaults because it cannot be overridden.
    label = defaults.name if defaults else None
    defaults = model_to_dict(defaults) if defaults else {}
    defaults["label"] = label
    # Also fetch the default levels metadata.
    defaults["levels"] = {
        level.number: model_to_dict(level)
        for level in HazardousWeatherOutlookLevels.objects.filter(type=risk_type, wfo=None)
    }

    # Now get any WFO-specific metadata.
    metadata = HazardousWeatherOutlookMetadata.objects.filter(type=risk_type, wfo=wfo).first()
    metadata = model_to_dict(metadata) if metadata else {}
    metadata["levels"] = {
        level.number: model_to_dict(level)
        for level in HazardousWeatherOutlookLevels.objects.filter(type=risk_type, wfo=wfo)
    }

    # And merge it in. The WFO-specific metadata will overwrite any default
    # metadata at the same location or with the same key in the defaults.
    metadata = always_merger.merge(defaults, metadata)

    if metadata:
        return {
            "id": metadata["type"],
            "label": metadata["label"],
            "basis_description": metadata["basis"],
            "levels": {
                level: {
                    "label": metadata["levels"][level]["label"],
                    "description": metadata["levels"][level]["description"],
                    "number": level,
                }
                for level in metadata["levels"]
            },
        }

    return None


def _get_risk_factor_ids(county_ghwo_data):
    """
    Return a list of risk key names (ids) for the given county ghwo data.

    GHWO county data is formatted as a set of days, each of which has keys
    for the different risks and values that represent metadata about the risk
    level for that day. We call these keys the risk_id.

    For now, we are using a preset mapping of risk_ids to
    risk labels. We consider these the 'canonical' set.

    Any risk that never gets above 0 for the time period
    is tossed out
    """
    risk_ids = set()
    all_risk_types = HazardousWeatherOutlookMetadata.get_all_types().keys()

    for day in county_ghwo_data["days"]:
        for key, risk in day["risks"].items():
            # We only want to consider risks whose category is greater than 0.
            if key in all_risk_types and risk["category"] > 0:
                risk_ids.add(key)

    return list(risk_ids)


def _get_risk_daily_rows(risk_ids, county_ghwo_data):
    """Return a list of dicts, each represending data used to render a table row."""
    result = []
    for risk_id in risk_ids:
        risk = _get_metadata_for_ghwo_risk_type(county_ghwo_data["wfo"], risk_id)

        # Get the risk level and other information for each day.
        # These represent the individual cells of the risk details
        # interactive table
        days = []
        for day in county_ghwo_data["days"]:
            if risk_id not in day["risks"]:
                level = 0
            else:
                level = day["risks"][risk_id]["category"]

            # Sometimes there is not an image for
            # a given risk factor. We set to None in
            # these cases
            if risk_id in day["images"]:
                image = day["images"][risk_id]
            else:
                image = None

            days.append(
                {
                    "level": risk["levels"][level],
                    "timestamp": day["timestamp"],
                    "datetime": datetime.fromisoformat(day["timestamp"]),
                    "day_number": day["dayNumber"],
                    "image": image,
                },
            )

        result.append(
            {
                "risk": risk,
                "days": days,
            },
        )
    return result


def _set_first_selected_day(rows):
    """Add is_first to the first 'viable' day in the list of row data.

    The rows are those representing data for rows in the interactive
    table.
    Each row has it's own days list, representing each cell in the row.
    'Viable' here means the first non-level-zero day and the earliest row
    in which it appears (if at all)
    """
    if not len(rows):
        return

    # We assume that all rows have the same number
    # of days in the data. To get the common days length
    # we use the first available row.
    num_days = len(rows[0]["days"])

    # We search by "column" instead of by row,
    # so that we find the first instance of a non-zero
    # level by day.
    for idx in range(num_days):
        for row in rows:
            day = row["days"][idx]
            if day["level"]["number"] > 0:
                day["is_first"] = True
                return


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
        # add the corresponding image url to the set.
        # _get_risk_factor_ids already ensures that
        # risk level is greater than 0.
        for key in risk_ids:
            if key in day["images"]:
                urls.add(day["images"][key])

    return list(urls)


def get_no_impact_risk_labels(county_ghwo_data):
    """Return a list of risk factor ids corresponding to risks that are never above 0."""
    risk_labels = set()
    all_risk_types = HazardousWeatherOutlookMetadata.get_all_types()
    for risk_id, risk_label in all_risk_types.items():
        has_level = False
        for day in county_ghwo_data["days"]:
            if risk_id in day and day[risk_id] > 0:
                has_level = True
        if not has_level:
            risk_labels.add(risk_label)

    return list(risk_labels)
