import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from django.db.models import Prefetch
from django.shortcuts import get_object_or_404, render
from django.views.decorators.cache import cache_control, never_cache
from shapely import MultiPolygon, Polygon

from backend import interop
from backend.models import WFO
from backend.util import (
    get_briefings_from_county_data,
    get_weather_stories_from_county_data,
    process_county_alerts,
)
from backend.util.county import risk_overview_timestamps_to_dates
from spatial.models import WeatherCounties, WeatherStates

logger = logging.getLogger(__name__)


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the county index page."""
    counties_qs = WeatherCounties.objects.defer("shape").order_by("countyname")
    states = (
        WeatherStates.objects.defer("shape")
        .prefetch_related(Prefetch("counties", queryset=counties_qs, to_attr="counties_list"))
        .all()
        .order_by("name")
    )
    state_list_items = [{"value": state.state, "text": state.name} for state in states]
    return render(request, "weather/county/index.html", {"states": states, "state_list_items": state_list_items})


@never_cache
def county_overview(request, countyfips):  # noqa: C901
    """Render the main page for a particular county."""
    county = get_object_or_404(WeatherCounties.objects.defer("shape"), countyfips=countyfips)
    county_data = interop.get_county_data(countyfips)

    localtz = ZoneInfo("UTC")
    if county.timezone:
        localtz = ZoneInfo(county.timezone)

    level_priorities = {
        "warning": 1024,
        "watch": 512,
        "other": 0,
    }

    # We use a list so we can look up by the original index provided in alertDays
    # Because `process_county_alerts` reorders the list and removes duplicates
    original_levels = [alert["metadata"]["level"]["text"] for alert in county_data["alerts"]["items"]]

    # Process alerts by sorting by timestamp and severity.
    county_data["alerts"]["items"] = process_county_alerts(county_data["alerts"]["items"])

    # Create a set of alerts
    levels_seen = {alert["metadata"]["level"]["text"] for alert in county_data["alerts"]["items"]}
    levels = list(levels_seen)
    levels.sort(key=lambda level: level_priorities[level], reverse=True)
    levels = [
        {
            "name": level,
            "css_class": f"wx_alert_map_legend--{level if level != 'other' else 'advisory'}",
            "translation_key": f"alerts.legend.{level if level != 'other' else 'advisory'}-area.01",
        }
        for level in levels
    ]

    level_days = []
    for day in county_data["alertDays"]:
        # day["alerts"] contains indices [0, 1, 2...].
        # Look them up in original_levels which matches those indices
        day_levels = [original_levels[index] for index in day["alerts"] if index < len(original_levels)]

        # Apply priority sorting to the string so "warning" appears before "watch"
        day_levels.sort(key=lambda level: level_priorities[level], reverse=True)
        level_days.append(" ".join(day_levels))

        day["start"] = datetime.fromisoformat(day["start"]).astimezone(tz=localtz)
        day["end"] = datetime.fromisoformat(day["end"]).astimezone(tz=localtz)
        day["day"] = day["start"].strftime("%A")

    # Format GeoJSON, sorting polygons within a Mutlipolygon by size (desc). Ticket #207
    for i, alert in enumerate(county_data["alerts"]["items"]):
        # Continue if geometry is missing OR if the type is not "MultiPolygon"
        if not alert.get("geometry") or alert["geometry"].get("type") != "MultiPolygon":
            continue

        polygons = []

        # Loop through nested polygons and format for shapely
        for polygon in alert["geometry"]["coordinates"]:
            shapely_polygon = Polygon(shell=polygon[0], holes=polygon[1:])
            polygons.append(shapely_polygon)

        # Sort and output
        sorted_polygons = sorted(polygons, key=lambda a: a.area, reverse=True)
        mu_polygon_sorted = MultiPolygon(polygons=sorted_polygons).__geo_interface__

        # Overwrite current alert coordinates
        county_data["alerts"]["items"][i]["geometry"] = mu_polygon_sorted

    # Fixup risk overview timestamps to local
    risk_overview_timestamps_to_dates(county_data.get("riskOverview", False), localtz)

    # Get a list of WFO codes that are associated
    # with the county. This seems to manifest in the data
    # as multiple CWAS, each corresponding to a different WFO
    # (in cases where the county has multiple WFOs)
    wfo_codes = [wfo for wfo in county_data["county"]["wfos"]]
    relevant_wfos = WFO.objects.filter(code__in=wfo_codes)
    briefings = get_briefings_from_county_data(county_data, relevant_wfos, localtz)

    # Weather story data is pulled from the interop county endpoint
    # response. We only need to pass the WFO model instances and the
    # timezone information to get the formatted list ready for the template.
    # weather_stories = get_county_weather_stories(relevant_wfos, localtz)
    weather_stories = get_weather_stories_from_county_data(county_data, relevant_wfos, localtz)

    # Assume primary WFO is the first one.
    wfo = relevant_wfos[0] if relevant_wfos else None

    (lon, lat) = county.shape.centroid.coords

    return render(
        request,
        "weather/county/overview.html",
        {
            "countyfips": countyfips,
            "data": {
                "alert_levels": levels,
                "alert_level_days": level_days,
                "public": county_data,
                "briefings": briefings,
                "weather_stories": weather_stories,
                "county_label": county.label,
                "primary_wfo": wfo or None,
                "wfo_codes": wfo_codes,
                "bounds": county_data["county"].get("bounds", None),
                "radar": { "radarMetadata": {} },
            },
        },
    )
