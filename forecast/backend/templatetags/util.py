import json
import re
from datetime import datetime as dt
from zoneinfo import ZoneInfo

from django import template

from backend.util import mark_safer

register = template.Library()


@register.filter
def datetime(iso8601, tz=None):
    """Convert an ISO8601 string into a datetime object, optionally with timezone."""
    d = dt.fromisoformat(iso8601)
    return d.replace(tzinfo=ZoneInfo(tz)) if tz else d


@register.simple_tag
def time_range(start, end, **kwargs):
    """Convert a pair of ISO8601 strings into a date range."""
    start_dt = dt.fromisoformat(start)
    end_dt = dt.fromisoformat(end)

    start_formatted = start_dt.strftime("%A %-I:%M %p")
    end_formatted = end_dt.strftime("%-I:%M %p")

    if start_dt.day != end_dt.day:
        end_formatted = end_dt.strftime("%A %-I:%M %p")

    return mark_safer(
        f"""<time datetime="{start}">{start_formatted}</time> – <time datetime="{end}">{end_formatted}</time>"""
    )


@register.filter
def item_at_index(listlike, index):
    """If the first item is a list, get the index'th item from it."""
    if isinstance(listlike, list) and isinstance(index, int) and index < len(listlike):
        return listlike[index]
    return None


@register.simple_tag
def subtract(first, second):
    """Subtract `first` from `second`, coercing to float and converting empty strings to 0.0."""
    if first == "":
        first = 0
    if second == "":
        second = 0
    return float(first) - float(second)


@register.simple_tag
def place_label(place: dict):
    """Format a label with a place name and possibly a state."""
    if isinstance(place, str):
        return place
    name = place.get("name", "")
    state = place.get("state", None)
    if state:
        return f"{name}, {state}"
    return name


def json_encode(value):
    """Transform `value` to a JSON string. If `value` is not dict or list, returns empty string."""
    if isinstance(value, dict) or isinstance(value, list):
        return json.dumps(value)
    return ""


def normalize_alert_whitespace(text):
    """Replace Unix line breaks with HTML line breaks."""
    return mark_safer(text, lambda text: re.sub("(\n)+", "<br />", text))


def template_zip(a, b):
    """Zips two sets together."""
    return zip(a, b, strict=False)


register.filter("normalize_alert_whitespace", normalize_alert_whitespace)
register.filter("json_encode", json_encode)
register.filter("zip", template_zip)
