import logging
from zoneinfo import ZoneInfo

from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.cache import cache_control, never_cache
from django.views.decorators.http import require_POST

# from wx_stories_api.models import SituationReport, WeatherStory
from shapely import MultiPolygon, Polygon

from backend import interop
from backend.models import WFO
from backend.util import get_counties_combo_box_list, get_ghwo_daily_images, get_states_combo_box_list
from spatial.models import WeatherCounties, WeatherStates
from wx_stories_api.models import SituationReport

logger = logging.getLogger(__name__)


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the county index page."""
    states = (
        WeatherStates.objects.defer("shape")
        .prefetch_related("counties")
        .defer("counties__shape")
        .all()
        .order_by("name")
    )
    state_list_items = [
        {"value": state.state, "text": state.name}
        for state in states
    ]
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

    levels = [alert["metadata"]["level"] for alert in county_data["alerts"]["items"]]
    levels = {level["text"] for level in levels}
    levels = list(levels)
    levels.sort(key=lambda level: level_priorities[level], reverse=True)
    levels = [
        {
            "name": level,
            "css_class": f"wx_alert_map_legend--{level if level != 'other' else 'advisory'}",
            "translation_key": f"alerts.legend.{level if level != 'other' else 'advisory'}-area.01",
        }
        for level in levels
    ]

    levels_per_alert = [alert["metadata"]["level"]["text"] for alert in county_data["alerts"]["items"]]

    level_days = []
    for day in county_data["alertDays"]:
        day_levels = [levels_per_alert[index] for index in day["alerts"]]
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
    briefings = []
    weather_stories = []

    for cwa in cwas:
        wfo = WFO.objects.filter(code=cwa.wfo).first()
        if wfo:
            report = SituationReport.objects.current(wfo)
            if report:
                # If the county we found has an associated timezone, switch
                # the timestamps to use it before we do any formatting.
                if localtz:
                    report.created_at = report.created_at.astimezone(tz=localtz)
                    report.updated_at = report.updated_at.astimezone(tz=localtz)

                human_format = "%A, %b %-d %Y, %-I:%M %p %Z"

                briefing = {
                    "wfo": wfo,
                    "report": report,
                    "created": {
                        # Make some nice human-friendly default strings
                        "human": report.created_at.strftime(human_format),
                        # We also want ISO8601 timestamps we can put into
                        # the HTML time tags for in-browser localization.
                        "timestamp": report.created_at.isoformat(),
                    },
                }

                # When Django creates a report, the created_at and
                # updated_at are both set to NOW. However, nothing is ever
                # truly instantaneous, so there will be a time difference
                # between the two, on the order of a fraction of a second.
                # If the difference is more than 1 second, assume that the
                # briefing has been updated and include the update times.
                time_diff = report.updated_at - report.created_at
                if time_diff.total_seconds() > 1:
                    briefing["updated"] = {
                        "human": report.updated_at.strftime(human_format),
                        "timestamp": report.updated_at.isoformat(),
                    }

                briefings.append(briefing)

            # TODO: uncomment this when weather stories are ready to be live
            # weather_story = WeatherStory.objects.current(wfo).first()
            # if weather_story:
            #     weather_stories.append(weather_story)
        else:
            # If this happens, something has gone very wrong. We probably
            # don't want to propagate that to the user, though.
            logger.error(f"No matching WFO found for {cwa.wfo}")

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
                "weather_stories": sorted(weather_stories, key=lambda story: story.starttime, reverse=True),
                "county_label": county.label,
                "radar": radar,
                "primary_wfo": wfo or None,
            },
        },
    )


@never_cache
def county_ghwo(request, county_fips):
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

    # Add any image urls to the list of images to prefetch
    if "error" not in ghwo_data:
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
