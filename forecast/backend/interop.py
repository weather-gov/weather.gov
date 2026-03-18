import re
from datetime import datetime
from os import getenv
from zoneinfo import ZoneInfo

import requests
from django.utils.translation import gettext_lazy as _

from backend.exceptions import Http429
from backend.util.alert import set_timing
from spatial.models import WeatherAlertsCache

_ID_REGEX = re.compile("[^A-Z0-9]", re.IGNORECASE)


def _get_hour(dt):
    """Get the hour from datetime."""
    return dt.strftime("%-I%p").lower()


def _fetch(url):
    """Fetch a dictionary from the interop layer."""
    base_url = getenv("INTEROP_URL")
    full_url = f"{base_url}{url}"
    # 55s is 3x18+1 (as rec'd by requests); gunicorn timeout is 60s (in run.sh)
    response = requests.get(full_url, timeout=55)  # TODO: try-request block with logging

    if response.status_code == 429:  # noqa: PLR2004
        raise Http429

    return response.json()


def _api_fetch(url):
    """Fetch a dictionary directly from the weather API. Or the proxy, if present."""
    base_url = getenv("API_URL")
    if not base_url or base_url == "":
        base_url = "https://api.weather.gov"
    full_url = f"{base_url}{url}"
    # 55s is 3x18+1 (as rec'd by requests); gunicorn timeout is 60s (in run.sh)
    response = requests.get(full_url, timeout=55)  # TODO: try-request block with logging
    return response.json()


def _set_high_low_pops(day, is_marine):
    # The following are lists of readings needed for basic daily
    # forecast templates
    if is_marine:
        day["temps"] = [hour["temperature"]["degF"] for hour in day["hours"] if "temperature" in hour]

        # The forecast may not have any temperature data for some days, in which
        # case we can't very well know the high or low.
        day["low"] = min(day["temps"]) if day["temps"] else None
        day["high"] = max(day["temps"]) if day["temps"] else None
        day["pop"] = day.get("maxPop", 0)
    else:
        periods = day["periods"]
        day["temps"] = [period["data"]["temperature"]["degF"] for period in periods]
        valid_temps = [temp for temp in day["temps"] if temp is not None]
        day["low"] = min(valid_temps)
        day["high"] = max(valid_temps)
        day["pop"] = day.get("maxPop", 0)

    if day["pop"] is None:
        day["pop"] = 0


def _set_day_period_info(day, tz):
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
    day["id"] = _ID_REGEX.sub("", day["periods"][0]["start"])
    day["itemId"] = day["id"]
    day["dayId"] = day["id"]

    # Convenience variable for the number
    # of periods in the day
    day["numPeriods"] = len(periods)

    for period in periods:
        period["start"] = datetime.fromisoformat(period["start"]).astimezone(tz=tz)
        period["end"] = datetime.fromisoformat(period["end"]).astimezone(tz=tz)


def _process_astronomical_data(data, tz):
    """Process astronomical data."""
    astronomical_data = data.get("point", {}).get("astronomicalData", {})
    for key, value in astronomical_data.items():
        astronomical_data[key] = datetime.fromisoformat(value).astimezone(tz=tz)

    if "sunrise" in astronomical_data and "sunset" in astronomical_data:
        day_length = astronomical_data["sunset"] - astronomical_data["sunrise"]
        total_seconds = day_length.total_seconds()
        hours = int(total_seconds / 3600)
        total_seconds -= hours * 3600
        minutes = round(total_seconds / 60)
        astronomical_data["dayLength"] = f"{hours}h {minutes}m"

    if "civilTwilightBegin" in astronomical_data and "civilTwilightEnd" in astronomical_data:
        day_length = astronomical_data["civilTwilightEnd"] - astronomical_data["civilTwilightBegin"]
        total_seconds = day_length.total_seconds()
        hours = int(total_seconds / 3600)
        total_seconds -= hours * 3600
        minutes = round(total_seconds / 60)
        astronomical_data["dayLightLength"] = f"{hours}h {minutes}m"


def _process_interop_point_forecast(data):
    """
    Make structured lists like temperatures per day, high, low, and other lists for charts and tables.

    Args:
        data: a dictionary from the interop layer for point information

    Returns:
        The dictionary is modified IN PLACE, but is also returned.
    """
    is_marine = data["isMarine"]

    tz = ZoneInfo(data["place"]["timezone"])

    # Pull full alert data from the database. The interop only returns alert
    # hashes, in order to save on bandwidth.
    if "alerts" in data and "items" in data["alerts"] and len(data["alerts"]["items"]):
        alerts = WeatherAlertsCache.objects.only("alertjson").filter(hash__in=data["alerts"]["items"])
        # Map the hash to the alert object, with timings applied
        alerts = {alert.hash: set_timing(alert.alertjson, tz) for alert in alerts}
        # Now replace the alert hashes with actual alerts. If there's no
        # alert corresponding to a hash, just drop it. There's a small but
        # non-zero chance that the alert was removed from the cache in the
        # time between when the interop sent us this and when we queried.
        data["alerts"]["items"] = [alerts[hash] for hash in data["alerts"]["items"] if hash in alerts]

    if "days" in data["forecast"]:
        for day in data["forecast"]["days"]:
            day["start"] = datetime.fromisoformat(day["start"]).astimezone(tz=tz)
            day["end"] = datetime.fromisoformat(day["end"]).astimezone(tz=tz)

            if not is_marine:
                _set_day_period_info(day, tz)

            _set_high_low_pops(day, is_marine)

            # The following are lists of _hourly_ metrics needed for
            # hourly tables and charts
            _process_hourly_interop_data(day, tz)

            # We tell the templates that this day should have an
            # alert icon if there are any relevant alerts attached
            # to it
            day["hasAlertIcon"] = False
            if day["alerts"]["metadata"]["count"] > 0:
                day["hasAlertIcon"] = day["alerts"]["metadata"]["highest"] != ""

            # Process the Quantitative Precipitation Forecast (qpf)
            qpf = day["qpf"]

            qpf["times"] = []
            for period in qpf["periods"]:
                period["start"] = datetime.fromisoformat(period["start"]).astimezone(tz=tz)
                period["end"] = datetime.fromisoformat(period["end"]).astimezone(tz=tz)
                qpf["times"].append(f"{_get_hour(period['start'])}-{_get_hour(period['end'])}")

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

    if "timestamp" in data["observed"]:
        data["observed"]["timestamp"] = datetime.fromisoformat(data["observed"]["timestamp"]).astimezone(tz=tz)

    _process_astronomical_data(data, tz)

    return data


def _process_hourly_interop_data(day_data, tz):  # noqa: C901
    """Process hourly list information for the hourly metrics for each day."""
    hours = day_data["hours"]
    day_data["hourly"] = {
        "feelsLike": [],
        "times": [],
        "temps": [],
        "pops": [],
        "dewpoints": [],
        "relativeHumidity": [],
        "windSpeeds": [],
        "windGusts": [],
        "windDirections": [],
    }
    for hour in hours:
        # apparentTemperature
        hour["time"] = datetime.fromisoformat(hour["time"]).astimezone(tz)

        if "apparentTemperature" in hour:
            day_data["hourly"]["feelsLike"].append(hour["apparentTemperature"]["degF"])

        # times
        if "time" in hour:
            day_data["hourly"]["times"].append(hour["time"].strftime("%-I %p"))
        else:
            day_data["hourly"]["times"].append(None)

        # temps
        if "temperature" in hour:
            day_data["hourly"]["temps"].append(hour["temperature"]["degF"])

        # probability of precipitation
        if "probabilityOfPrecipitation" in hour:
            day_data["hourly"]["pops"].append(hour["probabilityOfPrecipitation"]["percent"])

        # dewpoints
        if "dewpoint" in hour:
            day_data["hourly"]["dewpoints"].append(hour["dewpoint"]["degF"])

        # relative humidity
        if "relativeHumidity" in hour:
            day_data["hourly"]["relativeHumidity"].append(hour["relativeHumidity"]["percent"])

        # wind speeds
        if "windSpeed" in hour:
            day_data["hourly"]["windSpeeds"].append(hour["windSpeed"]["mph"])

        # wind gusts
        if "windGust" in hour:
            day_data["hourly"]["windGusts"].append(hour["windGust"]["mph"])

        # wind direction
        if "windDirection" in hour:
            day_data["hourly"]["windDirections"].append(hour["windDirection"])

    return day_data


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

    # If the interop response says there's an error, just pass it straight back
    # rather than trying to process it.
    if "error" in data and data["error"]:
        return data

    return _process_interop_point_forecast(data)


def get_radar(lat, lon):
    """Fetch the radar metadata for a given lat/lon."""
    url = f"/radar/{lat}/{lon}"
    return _fetch(url)


def get_county_data(countyfips):
    """Get county data. Consolidated risk overview and alerts per county.

    To see an example, run:

        docker compose exec -it web bash
        ./manage.py shell
        from backend.interop import get_county_data
        get_point_forecast("27123")
    """
    return _fetch(f"/county/{countyfips}")


def get_health():
    """Fetch the interop health status."""
    url = "/"
    return _fetch(url)


def get_ghwo_data_for_county(county_fips):
    """Fetch GHWO data for the given county from the interop."""
    url = f"/risk-overview/{county_fips}"
    return _fetch(url)


def get_weather_stories(wfo):
    """
    Fetch the weather story metadata for a given WFO.

    Will return several options based on the scenario:
    - Reponse was OK: returns the first weather story
    - Reponse is OK, but list is empty: returns None
    - Response has error in it: return custom error dict
    - Other exception: return custom error dict
    """
    url = f"/offices/{wfo.upper()}/weatherstories"
    try:
        stories = _fetch(url)
        if len(stories) == 0:
            return None
        if "error" in stories:
            return {"error": stories["error"], "officeId": wfo.upper()}
        # the site currently shows one weather story
        # It _should_ be the case that the weather stories
        # come from the API in sorted order. For now, that is what
        # we will assume.
        return stories[0]
    except Exception as e:
        return {"error": repr(e), "officeId": wfo.upper()}


def get_briefing(wfo):
    """
    Fetch the current briefing for the given WFO, if any.

    Will return several options based on the scenario:
    - Response was OK: returns the briefing
    - Response was OK, but no briefing: returns None
    - Response has error in it: return custom error dict
    - Other exception: return custom error dict
    """
    url = f"/offices/{wfo.upper()}/briefing"
    try:
        briefing = _fetch(url)
        if "briefing" in briefing:
            return briefing["briefing"]
        if "error" in briefing:
            return {"error": briefing["error"], "officeId": wfo.upper()}
    except Exception as e:
        return {"error": repr(e), "officeId": wfo.upper()}
    return None


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
