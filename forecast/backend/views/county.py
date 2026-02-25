import logging
from zoneinfo import ZoneInfo

from django.db.models import Prefetch
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.cache import cache_control, never_cache
from django.views.decorators.http import require_POST
from shapely import MultiPolygon, Polygon

from backend import interop
from backend.models import WFO
from backend.util import (
    get_basis_for_ghwo_risk,
    get_counties_combo_box_list,
    get_ghwo_daily_images,
    get_states_combo_box_list,
    process_county_alerts,
)
from backend.util.nwsconnect import get_county_briefings, get_county_weather_stories
from spatial.models import WeatherCounties, WeatherStates

logger = logging.getLogger(__name__)


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the county index page."""
    states = (
        WeatherStates.objects.defer("shape")
        .prefetch_related(Prefetch("counties", queryset=WeatherCounties.objects.order_by("countyname")))
        .defer("counties__shape")
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

    localtz = None
    if county.timezone:
        localtz = ZoneInfo(county.timezone)

    cwas = county.cwas.defer("shape").all()

    # Get a list of WFO codes that are associated
    # with the county. This seems to manifest in the data
    # as multiple CWAS, each corresponding to a different WFO
    # (in cases where the county has multiple WFOs)
    wfo_codes = [cwa.wfo for cwa in cwas]
    relevant_wfos = WFO.objects.filter(code__in=wfo_codes)
    briefings = get_county_briefings(relevant_wfos, localtz)

    # For now, we are making a separate request to
    # the interop for the weather story data. Ideally this would be
    # handled by the interop itself in the county endpoint.
    # We use a utility method to do some gentle processing.
    weather_stories = get_county_weather_stories(relevant_wfos, localtz)

    # Assume primary WFO is the first one.
    wfo = relevant_wfos[0] if relevant_wfos else None

    (lon, lat) = county.shape.centroid.coords
    radar = interop.get_radar(lat, lon)

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
                "radar": radar,
                "primary_wfo": wfo or None,
                "wfo_codes": wfo_codes,
            },
        },
    )


@never_cache
def county_ghwo(request, county_fips):  # noqa: C901
    """Load a county GHWO details page by FIPS."""
    county = get_object_or_404(
        WeatherCounties.objects.select_related("state").only("countyname", "st", "countyfips", "state__fips"),
        countyfips=county_fips,
    )

    # Get all of the states, for use in the combobox dropdown.
    states = get_states_combo_box_list()

    # Now get a list of all counties in the same state as the found county.
    counties = get_counties_combo_box_list(county.state.fips)

    # Fetch the GHWO data for the county from the interop layer
    ghwo_data = interop.get_ghwo_data_for_county(county.countyfips)

    if "error" not in ghwo_data:
        # Get basis description for each risk, if we have it.
        for risk_id, risk in ghwo_data["legend"].items():
            risk["basis"] = get_basis_for_ghwo_risk(ghwo_data["wfo"], risk_id)
        # Now map those from the global legend into the risk-specific legends
        for risk_id, risk in ghwo_data["risks"].items():
            # GHWO legends don't always contain entries for every risk type.
            # Guard against that.
            if risk_id in ghwo_data["legend"]:
                if "basis" in ghwo_data["legend"][risk_id]:
                    risk["legend"]["basis"] = ghwo_data["legend"][risk_id]["basis"]

        # Pick the first non-zero value and mark it as first. This one
        # will be highlighted on page load.
        for risk in ghwo_data["risks"].values():
            for day in risk["days"]:
                if day["category"] > 0:
                    day["is_first"] = True
                    break
            else:
                continue
            break

        # Update the scaled value for screenreader text
        for day in ghwo_data["composite"]["days"]:
            if day["scaled"] is not None:
                day["scaled_10"] = day["scaled"] * 10

        # Add any image urls to the list of images to prefetch
        ghwo_data["prefetch_images"] = get_ghwo_daily_images(ghwo_data)

    return render(
        request,
        "weather/county/ghwo.html",
        {
            "counties": counties,
            "states": states,
            "county": county,
            "ghwo": ghwo_data,
        },
    )


@require_POST
@never_cache
def county_ghwo_index(request):
    """Redirects to the correct County GHWO page given the post data.

    Intended to be used by the <form> element in
    <wx-county-ghwo-selector>
    """
    current_state = request.POST.get("current-state")
    selected_state = request.POST.get("state-select")
    selected_county = request.POST.get("county-select")

    try:
        # If the current state does not match the selected
        # state, then we assume the state has changed
        # and that we should render the form with data for
        # the new state
        if current_state != selected_state:
            state = WeatherStates.objects.get(fips=selected_state)
            county = (
                WeatherCounties.objects.filter(
                    state__id=state.id,
                )
                .order_by("countyname")
                .first()
            )
            # Otherwise, we render as if the selected county
            # is the one we wish to render the form/page for
        else:
            county = WeatherCounties.objects.get(countyfips=selected_county)
    except Exception as e:
        raise Http404() from e

    # Redirect to the main county ghwo page for the
    # resolved county
    return redirect(
        reverse("county_ghwo", kwargs={"county_fips": county.countyfips}),
    )
