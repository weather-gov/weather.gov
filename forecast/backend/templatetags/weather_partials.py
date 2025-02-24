from django import template
from django.utils.translation import gettext_lazy as _
from django.utils import dateparse
from django.utils.safestring import mark_safe
from backend.models import DynamicSafetyInformation

register = template.Library()

# Constant for Radar "intensity" data
# This is used for the legend
RADAR_INTENSITIES = [
    {
        "dbz": "−35–0",
        "description": _("Extremely light (drizzle/snow)"),
        "gradient": "180deg, #8E827E 0%, #969155 17.64%, #A5A36D 27.53%, #D0D2B2 54.47%, #7E8BAF 100%",
    },
    {
        "dbz": "0–20",
        "description": _("Very light precipitation or general clutter"),
        "gradient": (
            "180deg, #7B88AE 0%, #5C71A6 17.64%, #445FA0 36.39%, #5DA9CC 61.25%, #59C0BA 73.2%, #52D6A2 87.85%,"
            " #3FD657 100%"
        ),
    },
    {
        "dbz": "20–40",
        "description": _("Light precipitation"),
        "gradient": (
            "180deg, #3FD657 0%, #3ED624 9.47%, #24890E 36.39%, #176108 61.25%, #819F06 73.2%, #FBE000 85.5%,"
            " #F4CB17 100%"
        ),
    },
    {
        "dbz": "40–50",
        "description": _("Moderate precipitation"),
        "gradient": "180deg, #F4CB17 0%, #EBB32D 25.38%, #F9B103 72.13%, #F52D04 73.91%, #D10808 99.72%",
    },
    {
        "dbz": "50–65",
        "description": _("Heavy precipitation or some hail"),
        "gradient": (
            "180deg, #D10808 0%, #A20F10 16.84%, #B00301 48.32%, #FEFBFF 49.94%, #EDA7FD 71.83%, #E474FC 83.75%,"
            " #F174FD 100%);"
        ),
    },
    {
        "dbz": ">65",
        "description": _("Extremely heavy precipitation including water-coated hail"),
        "gradient": "180deg, #F174FD 0%, #F875FF 30.26%, #AA0BFA 34%, #5B06D3 98.5%",
    },
]

# Renders the partial for the daily high/low information
@register.inclusion_tag("weather/partials/daily-high-low.html")
def daily_high_low(**kwargs):
    periods = kwargs["periods"]
    temps = [period["data"]["temperature"]["degF"] for period in periods]
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


# Renders a single alert link
@register.inclusion_tag("weather/partials/alert-link.html")
def alert_link(**kwargs):
    result = {}
    alert = kwargs["alert"]
    result["alertCount"] = 1
    result["alert"] = alert
    result["alertId"] = alert["id"]
    result["alertType"] = alert["event"]
    result["alertLevel"] = alert["level"]

    return result


# Renders the alert link in the daily summary
@register.inclusion_tag("weather/partials/alert-link.html")
def summary_alert_link(**kwargs):
    alerts = kwargs["alerts"]
    num_alerts = alerts["metadata"]["count"]
    alert_id = None
    alert_type = None
    alert_level = None
    if num_alerts == 0:
        return {}
    elif num_alerts == 1:
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


# Renders a daily forecast list item
# for a given day
@register.inclusion_tag("weather/partials/daily-forecast-list-item.html")
def daily_forecast_list_item(**kwargs):
    day = kwargs["day"]
    day_label = kwargs.get("dayLabel", day["periods"][0]["dayName"])
    return {
        "day": day,
        "dayLabel": day_label
    }


# Renders a daily summary list item
# for a given day
@register.inclusion_tag("weather/partials/daily-summary-list-item.html")
def daily_summary_list_item(**kwargs):
    day = kwargs["day"]
    day_label = kwargs.get("dayLabel", day["dayLabel"])

    return {
        "day": day,
        "dayLabel": day_label,
        "dayHours": day["hours"],
        "itemId": day["itemId"],
        "alerts": day["alerts"],
        "times": day["hourly"]["times"],
        "temps": day["hourly"]["temps"],
        "feelsLike": day["hourly"]["feelsLike"],
    }


# Renders a wind speed and direction arrow
@register.inclusion_tag("weather/partials/wind.html")
def wind_speed_direction(**kwargs):
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
    msg_name = f"wind.labels.speed-from-{direction_name}"
    sr_content = _(msg_name).format({"speed": speed})

    return {
        "speed": speed,
        "direction": direction,
        "sr_content": sr_content,
        "has_direction": has_direction,
        "has_speed": has_speed,
    }


# Renders the radar
@register.inclusion_tag("weather/partials/radar.html")
def radar(**kwargs):
    place = kwargs["place"]
    point = kwargs["point"]

    return {"place": place, "point": point, "intensities": RADAR_INTENSITIES}


# Render a quick forecast link item
@register.inclusion_tag("weather/partials/quick-forecast-link-item.html")
def quick_forecast_link_item(**kwargs):
    return {
        "day": kwargs.get("day")
    }


# Render an hourly details table
@register.inclusion_tag("weather/partials/hourly-table.html")
def hourly_table(**kwargs):
    day = kwargs["day"]

    return {
        **day,
        "alerts": day["alerts"]["items"]
    }


# Render the hourly charts
@register.inclusion_tag("weather/partials/hourly-charts.html")
def hourly_charts(**kwargs):
    hours = kwargs["hours"]
    day = kwargs["day"]
  
    return {
        **day["hourly"],
        "itemId": day["id"],
        "hours": hours,
        "qpf": day["qpf"]
    }


# Render the daily forecast quick-toggle component
@register.inclusion_tag("weather/partials/daily-forecast-quick-toggle.html")
def daily_forecast_quick_toggle(**kwargs):
    day = kwargs["day"]

    return day


# Render the QPF percipitation table
@register.inclusion_tag("weather/partials/precip.html")
def precip_table(**kwargs):
    qpf = kwargs["qpf"]
    as_table = kwargs.get("as_table", True)

    return {
        **qpf,
        "as_table": as_table
    }

@register.inclusion_tag("weather/partials/dynamic-safety-info.html")
def dynamic_safety_information(weather_event_type):
    """
    Respond with the (safe) html markup of safety information
    for the given alert type. If there is no corresponding
    safety information for the type, return None
    """
    try:
        found = DynamicSafetyInformation.objects.get(type=weather_event_type.lower())
        return {
            "body": mark_safe(found.body),
            "type": found.type
        }
    except DynamicSafetyInformation.DoesNotExist:
        return None
