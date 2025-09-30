from os import getenv

import requests
from django.utils import dateparse
from django.utils.translation import gettext_lazy as _


def _fetch(url):
    """Fetch a dictionary from the interop layer."""
    base_url = getenv("INTEROP_URL")
    full_url = f"{base_url}{url}"
    # 55s is 3x18+1 (as rec'd by requests); gunicorn timeout is 60s (in run.sh)
    response = requests.get(full_url, timeout=55)  # TODO: try-request block with logging
    response.raise_for_status()
    return response.json()


def _api_fetch(url):
    """Fetch a dictionary directly from the weather API. Or the proxy, if present."""
    base_url = getenv("API_URL")
    if not base_url or base_url == "":
        base_url = "https://api.weather.gov/"
    full_url = f"{base_url}{url}"
    # 55s is 3x18+1 (as rec'd by requests); gunicorn timeout is 60s (in run.sh)
    response = requests.get(full_url, timeout=55)  # TODO: try-request block with logging
    response.raise_for_status()
    return response.json()


def _process_interop_data(data):
    """
    Make structured lists like temperatures per day, high, low, and other lists for charts and tables.

    Args:
        data: a dictionary from the interop layer for point information

    Returns:
        The dictionary is modified IN PLACE, but is also returned.
    """
    for day in data["forecast"]["days"]:
        periods = day["periods"]

        # Days can have 1 - 3 periods, depending
        # on what time they are viewed. Examples:
        # 1 period: Usually means it's night time, but before midnight
        # 2 periods: Can mean a day period and a night period
        # 3 periods: Day and night periods, but preceded by an
        #                 'overnight' period that corresponds to between
        #                 midnight and 6am local time
        # In our case, we need to know if we are displaying a single period
        # that is just the (6pm-Midnight) "night" period, so we know
        # not to display a high temperature
        is_first_period = len(periods) == 1
        not_overnight = not periods[0]["isOvernight"]
        not_daytime = not periods[0]["isDaytime"]
        day["isNightPeriod"] = is_first_period and not_overnight and not_daytime

        # The templates construct element ids in several ways,
        # but this is usually the base when dealing with daily forecast data
        day["id"] = day["periods"][0]["monthAndDay"].lower().replace(" ", "-")
        day["itemId"] = day["id"]
        day["dayId"] = day["id"]

        # Set a default label for the day.
        # Template tags can/should override this as
        # needed via their arguments
        day["dayLabel"] = day["periods"][0]["dayName"]

        # The following are lists of readings needed for basic daily
        # forecast templates
        day["temps"] = [period["data"]["temperature"]["degF"] for period in periods]
        day["low"] = min(day["temps"])
        day["high"] = max(day["temps"])
        day["pop"] = day["maxPop"]
        if day["pop"] is None:
            day["pop"] = 0

        # Convenience variable for the number
        # of periods in the day
        day["numPeriods"] = len(periods)

        # The following are lists of _hourly_ metrics needed for
        # hourly tables and charts
        hours = day["hours"]
        day["hourly"] = {}
        day["hourly"]["feelsLike"] = [
            hour["apparentTemperature"]["degF"] for hour in hours if "apparentTemperature" in hour
        ]
        day["hourly"]["times"] = []
        for hour in hours:
            hour_label = hour.get("hour", None)
            day["hourly"]["times"].append(hour_label)
        day["hourly"]["temps"] = [hour["temperature"]["degF"] for hour in hours if "temperature" in hour]
        day["hourly"]["pops"] = [
            hour["probabilityOfPrecipitation"]["percent"] for hour in hours if "probabilityOfPrecipitation" in hour
        ]
        day["hourly"]["dewpoints"] = [hour["dewpoint"]["degF"] for hour in hours if "dewpoint" in hour]
        day["hourly"]["relativeHumidity"] = [
            hour["relativeHumidity"]["percent"] for hour in hours if "relativeHumidity" in hour
        ]
        day["hourly"]["windSpeeds"] = [hour["windSpeed"]["mph"] for hour in hours if "windSpeed" in hour]
        day["hourly"]["windGusts"] = [hour["windGust"]["mph"] for hour in hours if "windGust" in hour]
        day["hourly"]["windDirections"] = [hour["windDirection"] for hour in hours if "windDirection" in hour]

        # We tell the templates that this day should have an
        # alert icon if there are any relevant alerts attached
        # to it
        day["hasAlertIcon"] = False
        if day["alerts"]["metadata"]["count"] > 0:
            day["hasAlertIcon"] = day["alerts"]["metadata"]["highest"] != ""

        # Process the Quantitative Precipitation Forecast (qpf)
        qpf = day["qpf"]
        qpf["times"] = [f"{period['startHour']}-{period['endHour']}" for period in qpf["periods"]]
        qpf["liquid"] = [period["liquid"]["in"] for period in qpf["periods"]]
        qpf["snow"] = []
        qpf["ice"] = []
        # If other kinds of liquids are available, we process them
        qpf["liquidTitle"] = _("precip-table.table-header+legend.rain.01")
        if qpf["hasSnow"]:
            qpf["snow"] = [period["snow"]["in"] for period in qpf["periods"]]
            qpf["liquidTitle"] = _("precip-table.table-header+legend.water.01")
        if qpf["hasIce"]:
            qpf["ice"] = [period["ice"]["in"] for period in qpf["periods"]]
            qpf["liquidTitle"] = _("precip-table.table-header+legend.water.01")

        # Templates also need to know the numeric day and
        # month, for displaying tables and charts
        start_timestamp = periods[0]["start"]
        start_time = dateparse.parse_datetime(start_timestamp)
        day["for_day"] = f"{start_time.day:02d}"
        day["for_month"] = f"{start_time.month:02d}"

    return data


def get_point_forecast(lat, lon):
    """
    Fetch the forecast for a given lat/lon, w/ post-processing.

    To see an example, run:

        docker compose exec -it web bash
        ./manage.py shell
        from backend.interop import get_point_forecast
        get_point_forecast(44.92,-92.937)
    """
    url = f"/point/{lat}/{lon}"
    data = _fetch(url)
    return _process_interop_data(data)


def get_health():
    """Fetch the interop health status."""
    url = "/"
    return _fetch(url)


def get_wx_afd_by_id(afd_id):
    """
    Fetch an Area Forecast Discussion by ID.

    To see an example, run:

        docker compose exec -it web bash
        ./manage.py shell
        from backend.interop import get_wx_afd_versions_by_wfo, get_wx_afd_by_id
        get_wx_afd_by_id(get_wx_afd_versions_by_wfo("arx")["@graph"][0]["id"])
    """
    url = f"/products/{afd_id}"
    return _fetch(url)


def get_wx_afd_versions_by_wfo(wfo):
    """
    Fetch version information for a WFO's Area Forecast Discussions.

    To see an example, go to: https://api.weather.gov/products/types/AFD/locations/arx
    """
    url = f"/products/types/AFD/locations/{wfo}"
    return _api_fetch(url)


def get_wx_afd_versions():
    """
    Fetch the list of all Area Forecast Discussion versions.

    To see an example, go to https://api.weather.gov/products/types/AFD
    """
    url = "/products/types/AFD"
    return _api_fetch(url)
