from django import template
from django.utils.translation import gettext_lazy as _
from django.utils import dateparse

register = template.Library()


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
    day_hours = day["hours"]
    item_id = kwargs.get("itemId", None)
    qpf = day["qpf"]
    alerts = day["alerts"]

    # We need to ensure there is always an item id
    # for use by the element. If one is not provided,
    # this is the default that we use
    if not item_id:
        item_id = day["periods"][0]["monthAndDay"].lower().replace(" ", "-")

    # Map data for the chart
    temps = [hour["temperature"]["degF"] for hour in day_hours if "temperature" in hour]
    feels_like = [hour["apparentTemperature"]["degF"] for hour in day_hours if "apparentTemperature" in hour]

    return {
        "day": day,
        "dayLabel": day_label,
        "dayHours": day_hours,
        "itemId": item_id,
        "alerts": alerts,
        "temps": temps,
        "feelsLike": feels_like,
        "qpf": qpf,
    }


# Renders a daily summary list item
# for a given day
@register.inclusion_tag("weather/partials/daily-summary-list-item.html")
def daily_summary_list_item(**kwargs):
    day = kwargs["day"]
    day_label = kwargs.get("dayLabel", day["periods"][0]["dayName"])
    day_hours = day["hours"]
    item_id = kwargs.get("itemId", None)
    alerts = day["alerts"]

    # We need to ensure there is always an item id
    # for use by the element. If one is not provided,
    # this is the default that we use
    if not item_id:
        item_id = day["periods"][0]["monthAndDay"].lower().replace(" ", "-")

    # Map data for the chart
    times = [hour["hour"] for hour in day_hours]
    temps = [hour["temperature"]["degF"] for hour in day_hours]
    feels_like = [hour["apparentTemperature"]["degF"] for hour in day_hours]

    return {
        "day": day,
        "dayLabel": day_label,
        "dayHours": day_hours,
        "itemId": item_id,
        "alerts": alerts,
        "times": times,
        "temps": temps,
        "feelsLike": feels_like,
    }


# Renders a wind speed and direction arrow
@register.inclusion_tag("weather/partials/wind.html")
def wind_speed_direction(**kwargs):
    has_direction = False
    speed = kwargs["speed"]
    has_speed = speed is not None and speed != ""
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
    INTENSITIES = [
        {
            "dbz": "−35–0",
            "description": "Extremely light (drizzle/snow)",
            "gradient": "180deg, #8E827E 0%, #969155 17.64%, #A5A36D 27.53%, #D0D2B2 54.47%, #7E8BAF 100%",
        },
        {
            "dbz": "0–20",
            "description": "Very light precipitation or general clutter",
            "gradient": (
                "180deg, #7B88AE 0%, #5C71A6 17.64%, #445FA0 36.39%, #5DA9CC 61.25%, #59C0BA 73.2%, #52D6A2 87.85%,"
                " #3FD657 100%"
            ),
        },
        {
            "dbz": "20–40",
            "description": "Light precipitation",
            "gradient": (
                "180deg, #3FD657 0%, #3ED624 9.47%, #24890E 36.39%, #176108 61.25%, #819F06 73.2%, #FBE000 85.5%,"
                " #F4CB17 100%"
            ),
        },
        {
            "dbz": "40–50",
            "description": "Moderate precipitation",
            "gradient": "180deg, #F4CB17 0%, #EBB32D 25.38%, #F9B103 72.13%, #F52D04 73.91%, #D10808 99.72%",
        },
        {
            "dbz": "50–65",
            "description": "Heavy precipitation or some hail",
            "gradient": (
                "180deg, #D10808 0%, #A20F10 16.84%, #B00301 48.32%, #FEFBFF 49.94%, #EDA7FD 71.83%, #E474FC 83.75%,"
                " #F174FD 100%);"
            ),
        },
        {
            "dbz": ">65",
            "description": "Extremely heavy precipitation including water-coated hail",
            "gradient": "180deg, #F174FD 0%, #F875FF 30.26%, #AA0BFA 34%, #5B06D3 98.5%",
        },
    ]
    place = kwargs["place"]
    point = kwargs["point"]

    return {"place": place, "point": point, "intensities": INTENSITIES}


# Render a quick forecast link item
@register.inclusion_tag("weather/partials/quick-forecast-link-item.html")
def quick_forecast_link_item(**kwargs):
    result = {}
    day = kwargs["day"]
    result["day"] = day
    result["day_id"] = day["periods"][0]["monthAndDay"].lower().replace(" ", "-")
    result["temps"] = [period["data"]["temperature"]["degF"] for period in day["periods"]]
    result["low"] = min(result["temps"])
    result["high"] = max(result["temps"])
    result["numPeriods"] = len(day["periods"])
    is_first_period = len(day["periods"]) == 1
    not_overnight = not day["periods"][0]["isOvernight"]
    not_daytime = not day["periods"][0]["isDaytime"]
    result["isNightPeriod"] = is_first_period and not_overnight and not_daytime
    result["pop"] = day["maxPop"]
    if result["pop"] is None:
        result["pop"] = 0

    # If there are no alerts, we need to specify
    # a default for the highest alert level
    result["hasAlertIcon"] = False
    if day["alerts"]["metadata"]["count"] > 0:
        result["hasAlertIcon"] = day["alerts"]["metadata"]["highest"] != ""

    return result


# Render an hourly details table
@register.inclusion_tag("weather/partials/hourly-table.html")
def hourly_table(**kwargs):
    result = {}
    day = kwargs["day"]
    result["qpf"] = kwargs["qpf"]
    result["itemId"] = kwargs.get("itemId", False)
    if not result["itemId"]:
        result["itemId"] = day["periods"][0]["monthAndDay"].lower().replace(" ", "-")
    result["periods"] = day["periods"]
    result["hours"] = day["hours"]
    result["alerts"] = day["alerts"]["items"]
    start_timestamp = day["periods"][0]["start"]
    start_time = dateparse.parse_datetime(start_timestamp)
    result["for_day"] = f"{start_time.day:02d}"
    result["for_month"] = f"{start_time.month:02d}"

    return result


# Render the hourly charts
@register.inclusion_tag("weather/partials/hourly-charts.html")
def hourly_charts(**kwargs):
    result = {}
    hours = kwargs["hours"]
    day = kwargs["day"]
    result["qpf"] = kwargs["qpf"]
    result["itemId"] = kwargs.get("itemId", False)
    if not result["itemId"]:
        result["itemId"] = day["periods"][0]["monthAndDay"].lower().replace(" ", "-")
    result["times"] = [hour["hour"] for hour in hours if "hour" in hour]
    result["temps"] = [hour["temperature"]["degF"] for hour in hours if "temperature" in hour]
    result["feelsLike"] = [hour["apparentTemperature"]["degF"] for hour in hours if "apparentTemperature" in hour]
    result["pops"] = [
        hour["probabilityOfPrecipitation"]["percent"] for hour in hours if "probabilityOfPrecipitation" in hour
    ]
    result["dewpoints"] = [hour["dewpoint"]["degF"] for hour in hours if "dewpoint" in hour]
    result["relativeHumidity"] = [hour["relativeHumidity"]["percent"] for hour in hours if "relativeHumidity" in hour]
    result["windSpeeds"] = [hour["windSpeed"]["mph"] for hour in hours if "windSpeed" in hour]
    result["windGusts"] = [hour["windGust"]["mph"] for hour in hours if "windGust" in hour]
    result["windDirections"] = [hour["windDirection"] for hour in hours if "windDirection" in hour]

    return result


# Render the daily forecast quick-toggle component
@register.inclusion_tag("weather/partials/daily-forecast-quick-toggle.html")
def daily_forecast_quick_toggle(**kwargs):
    result = {}
    day = kwargs["day"]
    result["day"] = day
    result["dayId"] = day["periods"][0]["monthAndDay"].lower().replace(" ", "-")
    result["temps"] = [period["data"]["temperature"]["degF"] for period in day["periods"]]
    result["low"] = min(result["temps"])
    result["high"] = max(result["temps"])
    result["numPeriods"] = len(day["periods"])
    is_not_overnight = not day["periods"][0]["isOvernight"]
    is_not_daytime = not day["periods"][0]["isDaytime"]
    result["isNightPeriod"] = result["numPeriods"] == 1 and is_not_overnight and is_not_daytime
    result["pop"] = day["maxPop"]
    if result["pop"] is None:
        result["pop"] = 0

    result["hasAlertIcon"] = False
    if day["alerts"]["metadata"]["count"] > 0:
        result["hasAlertIcon"] = day["alerts"]["metadata"]["highest"] != ""

    return result


# Render the QPF percipitation table
@register.inclusion_tag("weather/partials/precip.html")
def precip_table(**kwargs):
    result = {}
    qpf = kwargs["qpf"]
    result["qpf"] = qpf
    result["as_table"] = kwargs.get("as_table", True)
    result["times"] = [f"{period['startHour']}-{period['endHour']}" for period in qpf["periods"]]
    result["liquid"] = [period["liquid"]["in"] for period in qpf["periods"]]
    result["snow"] = []
    result["ice"] = []

    # If other kinds of liquids are available, we process them
    result["liquidTitle"] = _("precip-table.table-header+legend.rain.01")
    if qpf["hasSnow"]:
        result["snow"] = [period["snow"]["in"] for period in qpf["periods"]]
        result["liquidTitle"] = _("precip-table.table-header+legend.water.01")
    if qpf["hasIce"]:
        result["ice"] = [period["ice"]["in"] for period in qpf["periods"]]
        result["liquidTitle"] = _("precip-table.table-header+legend.water.01")

    return result
