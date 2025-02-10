from django import template
from django.utils.safestring import mark_safe

register = template.Library()

@register.simple_tag
def subtract(first, second):
    """
    Given two variables, subtract the second
    one from the first one and return the result.
    We assume that both arguments will be numbers
    """
    if first == "":
        first = 0
    if second == "":
        second = 0
    return float(first) - float(second)

def json_encode(value):
    if isinstance(value, dict) or isinstance(value, list):
        return json.dumps(value)
    return ""


def normalize_wfo(value):
    anchorage_alternates = ["alu", "aer"]
    if value.lower() in anchorage_alternates:
        return "AFC"
    return value


def normalize_alert_whitespace(text):
    return mark_safe(re.sub("\n+", "<br />", text))

register.filter("normalize_wfo", normalize_wfo)
register.filter("normalize_alert_whitespace", normalize_alert_whitespace)
register.filter("json_encode", json_encode)
