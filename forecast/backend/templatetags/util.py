import json
import re

from django import template

from backend.util import mark_safer

register = template.Library()


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


def normalize_wfo(value):
    """Transform a WFO code into its cannonical form."""
    anchorage_alternates = ["alu", "aer"]
    if value.lower() in anchorage_alternates:
        return "AFC"
    return value


def normalize_alert_whitespace(text):
    """Replace Unix line breaks with HTML line breaks."""
    return mark_safer(text, lambda text: re.sub("(\n)+", "<br />", text))


def template_zip(a, b):
    """Zips two sets together."""
    return zip(a, b, strict=False)


register.filter("normalize_wfo", normalize_wfo)
register.filter("normalize_alert_whitespace", normalize_alert_whitespace)
register.filter("json_encode", json_encode)
register.filter("zip", template_zip)
