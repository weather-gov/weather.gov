from django import template
from django.utils.translation import gettext_lazy as _

from backend.models import DynamicSafetyInformation
from backend.util import mark_safer

register = template.Library()

# Constant for Radar "intensity" data. This is used for the legend.
RADAR_INTENSITIES = [
    {
        "dbz": "−35–0",
        "description": _("Extremely light (drizzle/snow)"),
    },
    {
        "dbz": "0–20",
        "description": _("Very light precipitation or general clutter"),
    },
    {
        "dbz": "20–40",
        "description": _("Light precipitation"),
    },
    {
        "dbz": "40–50",
        "description": _("Moderate precipitation"),
    },
    {
        "dbz": "50–65",
        "description": _("Heavy precipitation or some hail"),
    },
    {
        "dbz": ">65",
        "description": _("Extremely heavy precipitation including water-coated hail"),
    },
]


@register.inclusion_tag("weather/partials/daily-high-low.html")
def daily_high_low(**kwargs):
    """Render the partial for the daily high/low information."""
    periods = kwargs["periods"]
    temps = [
        period["data"]["temperature"]["degF"]
        for period in periods
        if period["data"]["temperature"]["degF"] is not None
    ]
    low = min(temps)
    high = max(temps)

    # We show the high and/or low
    # based on the periods and
    # whether there are several or only
    # a daytime period
    show_high = False
    show_low = False
    if len(periods) > 1 or periods[0]["isDaytime"]:
        show_high = True
    if len(periods) > 1 or not periods[0]["isDaytime"]:
        show_low = True

    return {"high": high, "low": low, "show_high": show_high, "show_low": show_low}


@register.inclusion_tag("weather/partials/alert-link.html")
def alert_link(**kwargs):
    """Render a single alert link."""
    result = {}
    alert = kwargs["alert"]
    result["alertCount"] = 1
    result["alert"] = alert
    result["alertId"] = alert["id"]
    result["alertType"] = alert["event"]
    result["alertLevel"] = alert["level"]

    return result


@register.inclusion_tag("weather/partials/alert-link.html")
def summary_alert_link(**kwargs):
    """Render the alert link in the daily summary."""
    alerts = kwargs["alerts"]
    num_alerts = alerts["metadata"]["count"]
    alert_id = None
    alert_type = None
    alert_level = None
    if num_alerts == 0:
        return {}
    if num_alerts == 1:
        alert_id = alerts["items"][0]["id"]
        alert_type = alerts["items"][0]["event"]
        alert_level = alerts["items"][0]["level"]
    else:
        alert_type = _("daily-forecast.labels.multiple-alerts.01")
        alert_level = alerts["metadata"]["highest"]

    return {
        "alertID": alert_id,
        "alertType": alert_type,
        "alertLevel": alert_level,
        "alertCount": num_alerts,
    }


@register.inclusion_tag("weather/partials/daily-forecast-list-item.html")
def daily_forecast_list_item(**kwargs):
    """Render a daily forecast list item for a given day."""
    day = kwargs["day"]
    return {"day": day, "first": kwargs.get("first") or False}


@register.inclusion_tag("weather/partials/daily-summary-list-item.html")
def daily_summary_list_item(**kwargs):
    """Render a daily summary list item for a given day."""
    day = kwargs["day"]

    return {
        "day": day,
        "dayHours": day["hours"],
        "itemId": day["itemId"],
        "alerts": day["alerts"],
        "times": day["hourly"]["times"],
        "temps": day["hourly"]["temps"],
        "feelsLike": day["hourly"]["feelsLike"],
    }


@register.inclusion_tag("weather/partials/wind.html")
def wind_speed_direction(**kwargs):
    """Render a wind speed and direction arrow."""
    has_direction = False
    has_speed = False
    speed = kwargs["speed"]
    if "mph" in speed:
        has_speed = speed["mph"] is not None and speed["mph"] != ""
    direction = kwargs["direction"]
    if direction and direction != "":
        has_direction = direction["cardinalLong"] is not None
    direction_name = ""
    if has_direction:
        direction_name = direction["cardinalLong"].lower()

    # Get the name of the directional i18n message
    sr_content = ""

    if has_speed and has_direction:
        msg_name = f"wind.labels.speed-from-{direction_name}.01"
        sr_content = _(msg_name).format(speed=speed["mph"])

    return {
        "speed": speed,
        "direction": direction,
        "sr_content": sr_content,
        "has_direction": has_direction,
        "has_speed": has_speed,
    }


@register.inclusion_tag("weather/partials/radar.html")
def radar(**kwargs):
    """Render the radar."""
    place = kwargs["place"]
    point = kwargs["point"]
    radar_metadata = kwargs["radar_metadata"]
    radar_heading_level = "h2"  # default value
    if "heading_level" in kwargs:
        radar_heading_level = kwargs["heading_level"]
    radar_heading_class = kwargs.get("heading_class", None)

    return {
        "place": place,
        "point": point,
        "radar_metadata": radar_metadata,
        "intensities": RADAR_INTENSITIES,
        "heading_level": radar_heading_level,
        "heading_class": radar_heading_class,
    }


@register.inclusion_tag("weather/partials/quick-forecast-link-item.html")
def quick_forecast_link_item(**kwargs):
    """Render a quick forecast link item."""
    return {"day": kwargs.get("day"), "first": kwargs.get("first") or False}


@register.inclusion_tag("weather/partials/hourly-table.html")
def hourly_table(**kwargs):
    """Render an hourly details table."""
    day = kwargs["day"]

    return {**day, "alerts": day["alerts"]["items"]}


@register.inclusion_tag("weather/partials/hourly-charts.html")
def hourly_charts(**kwargs):
    """Render the hourly charts."""
    hours = kwargs["hours"]
    day = kwargs["day"]

    return {**day["hourly"], "itemId": day["id"], "hours": hours, "qpf": day["qpf"]}


@register.inclusion_tag("weather/partials/daily-forecast-quick-toggle.html")
def daily_forecast_quick_toggle(**kwargs):
    """Render the daily forecast quick-toggle component."""
    return {**kwargs["day"], "first": kwargs.get("first") or False}


@register.inclusion_tag("weather/partials/precip.html")
def precip_table(**kwargs):
    """Render the QPF percipitation table."""
    qpf = kwargs["qpf"]
    as_table = kwargs.get("as_table", True)

    return {**qpf, "as_table": as_table}


@register.inclusion_tag("weather/partials/dynamic-safety-info.html")
def dynamic_safety_information(weather_event_type):
    """Return HTML markup of safety information for a given alert type, if any exists."""
    try:
        found = DynamicSafetyInformation.objects.get(type=weather_event_type.lower())
        return {"body": mark_safer(found.body), "type": found.type}
    except DynamicSafetyInformation.DoesNotExist:
        return None


@register.inclusion_tag("weather/partials/weather-icon.html")
def weather_icon(icon_name, size="sm", color_mode="light", **kwargs):
    """Return HTML markup for rendering a specific weather icon from the spritesheet."""
    full_icon_name = f"{icon_name}_{size}_{color_mode}"
    result = {
        "icon_name": full_icon_name,
        "size": size,
        "color_mode": color_mode,
        "attrs": {
            "role": "img",
        },
    }

    # Additional kwargs will be interpreted as
    # additional html attribute values on the wrapping
    # svg element
    if not kwargs:
        return result

    result["has_attrs"] = True
    for key, val in kwargs.items():
        result_key = key
        if "_" in key:
            result_key = key.replace("_", "-")
        if key in result["attrs"]:
            result["attrs"][result_key] = f"{result['attrs'][result_key]} {val}"
        else:
            result["attrs"][result_key] = val

    return result
