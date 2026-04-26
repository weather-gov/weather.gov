import json

import geobuf
from django.contrib.gis.serializers.geojson import Serializer
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.template.loader import render_to_string
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from shapely import MultiPolygon, Polygon

from backend import interop
from backend.exceptions import Http429, Http504
from backend.util import get_counties_combo_box_list, get_states_combo_box_list, process_state_alerts
from spatial.models import WeatherAlertsCache, WeatherCounties, WeatherStates


@never_cache
def wx_afd_id(_, afd_id):
    """Return _markup only_ for a single parsed AFD product by id."""
    data = interop.get_wx_afd_by_id(afd_id)
    markup = render_to_string("weather/afd/afd.html", {"afd": data})
    return HttpResponse(markup, content_type="text/html")


@never_cache
def wx_afd_versions(_, wfo):
    """Return _markup only_ for the versions of AFDs for the given forecast office."""
    data = interop.get_wx_afd_versions_by_wfo(wfo)
    markup = render_to_string("weather/afd/afd_versions_select.html", {"version_list": data["@graph"]})
    return HttpResponse(markup, content_type="text/html")


@never_cache
def wx_state_boundaries_pbf(_, state):
    """Return a script tag containing the GeoJSON for the given state's boundaries."""
    state_obj = get_object_or_404(WeatherStates, state=state.upper())
    geojson_dict = json.loads(state_obj.shape.geojson)
    pbf_data = geobuf.encode(geojson_dict)
    return HttpResponse(pbf_data, content_type="application/x-protobuf")


@never_cache
def wx_state_alerts_pbf(_, state):
    """Return Geobuf-encoded alerts for a state with internally sorted geometries."""
    state_obj = get_object_or_404(WeatherStates, state=state.upper())
    state_fips = state_obj.fips

    # Get all alerts for the state
    alerts = WeatherAlertsCache.objects.filter(states__contains=[state_fips]).only(
        "id", "alertjson", "alertkind", "counties", "states", "shape"
    )

    state_fips = state_obj.fips

    # Get Weather alerts for state
    alerts_queryset = WeatherAlertsCache.objects.filter(states__contains=[state_fips]).only(
        "id", "alertjson", "alertkind", "counties", "states"
    )

    # Loop through all alerts and create set of counties
    all_fips = set()
    for alert in alerts_queryset:
        if alert.counties:
            all_fips.update(alert.counties)

    # Query all FIPS and names for each alert county
    county_map = dict(WeatherCounties.objects.filter(countyfips__in=all_fips).values_list("countyfips", "countyname"))

    # Serialize and load the data for encoding
    serializer = Serializer()
    geojson_data = serializer.serialize(
        alerts, geometry_field="shape", fields=("alertjson", "alertkind", "counties", "states")
    )
    geojson_dict = json.loads(geojson_data)

    #  Internal Sorting Logic (Ticket #207)
    for feature in geojson_dict.get("features", []):
        # Remove the nested geometry field
        feature["properties"]["alertjson"].pop("geometry", None)

        geom = feature.get("geometry")

        counties_mapping = {
            fips: county_map.get(fips, fips)
            for fips in feature["properties"]["counties"]
            if str(fips).startswith(str(state_fips))
        }
        feature["properties"]["alertjson"]["total_counties_display"] = len(counties_mapping)

        # We only care about MultiPolygons
        if not geom or geom.get("type") != "MultiPolygon":
            continue

        # Loop through nested polygons and format for shapely
        polygons = [Polygon(shell=poly_coords[0], holes=poly_coords[1:]) for poly_coords in geom["coordinates"]]

        # Sort and output
        sorted_polygons = sorted(polygons, key=lambda a: a.area, reverse=True)
        feature["geometry"] = MultiPolygon(polygons=sorted_polygons).__geo_interface__

    # Process alerts by sorting by timestamp and severity
    geojson_dict["features"] = process_state_alerts(geojson_dict["features"])

    # Encode and return
    pbf_data = geobuf.encode(geojson_dict)
    return HttpResponse(pbf_data, content_type="application/x-protobuf")


def wx_select_state_counties(_request, state_fips):
    """Respond with a list of combo-box items in JSON for counties in the given state."""
    results = []
    for county in WeatherCounties.objects.filter(state__fips=state_fips).order_by("countyname"):
        results.append(
            {
                "text": f"{county.countyname}, {county.state.state}",
                "value": county.countyfips,
            },
        )

    return JsonResponse(
        {
            "stateFips": state_fips,
            "state": county.state.state,
            "items": results,
        },
    )


@require_POST
@csrf_exempt
@never_cache
def wx_select_ghwo_counties(request):
    """Respond with markup for a <wx-county-ghwo-selector> element.

    Will respond with the HTML for the element partial only,
    using the state and county information provided in the POST
    data.
    """
    current_state = request.POST.get("current-state")
    current_county = request.POST.get("current-county")
    selected_state = request.POST.get("state", current_state)
    selected_county = request.POST.get("county", current_county)

    try:
        # If the current state does not match the selected
        # state, then we assume the state has changed
        # and that we should render the form with data for
        # the new state
        if current_state != selected_state:
            state = WeatherStates.objects.defer("shape").get(fips=selected_state)
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
            county = WeatherCounties.objects.defer("shape").get(countyfips=selected_county)
            state = county.state

        # Get the needed state dropdown data
        states = get_states_combo_box_list(state.fips)

        # Get the needed county dropdown data
        counties = get_counties_combo_box_list(state.fips, county.countyfips)
    except Exception as e:
        raise Http404() from e

    return render(
        request,
        "weather/partials/wx-county-ghwo-selector.html",
        {
            "counties": counties,
            "states": states,
            "county": county,
        },
    )


@require_GET
@never_cache
def wx_ghwo_counties(request, county_fips):
    """Respond with markup for the County GHWO details.

    Will respond with the HTML for a partial only,
    using the county FIPS code provided in the
    URL param.
    """
    county = get_object_or_404(WeatherCounties.objects.defer("shape"), countyfips=county_fips)

    # Fetch the GHWO data for the county
    ghwo_data = interop.get_ghwo_data_for_county(county_fips)

    # Render the partial
    return render(
        request,
        "weather/partials/ghwo-details.html",
        {
            "ghwo": ghwo_data,
            "county": county,
        },
    )


@require_GET
@never_cache
def wx_point_header(request, lat, lon):
    """Render the point header partial view."""
    try:
        point = interop.get_point_forecast(lat, lon)
    except Http504:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.504.interop.heading.01"),
                "body": _("error.504.interop.description.01"),
            },
        )
    except Http429:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.429.interop.heading.01"),
                "body": _("error.429.interop.description.01"),
            },
        )
    except Exception:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {"level": "error", "body": _("forecast.errors.loading.01")},
        )

    return render(
        request,
        "weather/point/partials/header.html",
        {"point": point},
    )


@require_GET
@never_cache
def wx_point_alerts(request, lat, lon):
    """Render the point alerts partial view."""
    try:
        point = interop.get_point_forecast(lat, lon)
    except Http504:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.504.interop.heading.01"),
                "body": _("error.504.interop.description.01"),
            },
        )
    except Http429:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.429.interop.heading.01"),
                "body": _("error.429.interop.description.01"),
            },
        )
    except Exception:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {"level": "error", "body": _("forecast.errors.loading.01")},
        )

    return render(
        request,
        "weather/point/partials/alerts.html",
        {"point": point},
    )


@require_GET
@never_cache
def wx_point_today(request, lat, lon):
    """Render the point today partial view."""
    try:
        point = interop.get_point_forecast(lat, lon)
    except Http504:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.504.interop.heading.01"),
                "body": _("error.504.interop.description.01"),
            },
        )
    except Http429:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.429.interop.heading.01"),
                "body": _("error.429.interop.description.01"),
            },
        )
    except Exception:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {"level": "error", "body": _("forecast.errors.loading.01")},
        )

    weather_story = {}
    if "grid" in point and "wfo" in point["grid"] and "place" in point and "timezone" in point["place"]:
        from zoneinfo import ZoneInfo  # noqa: PLC0415

        from backend.models import WFO  # noqa: PLC0415
        from backend.util import get_weather_story_from_point_data  # noqa: PLC0415

        localtz = ZoneInfo(point["place"]["timezone"])
        code = point["grid"]["wfo"]
        try:
            wfo = WFO.objects.get(code=WFO.normalize_code(code))
            point["wfo"] = wfo
            weather_story = get_weather_story_from_point_data(point, wfo, localtz)
            if "weatherstory" in point:
                del point["weatherstory"]
        except WFO.DoesNotExist:
            pass

    return render(
        request,
        "weather/point/partials/today.html",
        {"point": point, "weather_story": weather_story},
    )


@require_GET
@never_cache
def wx_point_footer(request, lat, lon):
    """Render the point footer partial view."""
    try:
        point = interop.get_point_forecast(lat, lon)
    except Http504:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.504.interop.heading.01"),
                "body": _("error.504.interop.description.01"),
            },
        )
    except Http429:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.429.interop.heading.01"),
                "body": _("error.429.interop.description.01"),
            },
        )
    except Exception:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {"level": "error", "body": _("forecast.errors.loading.01")},
        )

    weather_story = {}
    if "grid" in point and "wfo" in point["grid"] and "place" in point and "timezone" in point["place"]:
        from zoneinfo import ZoneInfo  # noqa: PLC0415

        from backend.models import WFO  # noqa: PLC0415
        from backend.util import get_weather_story_from_point_data  # noqa: PLC0415

        localtz = ZoneInfo(point["place"]["timezone"])
        code = point["grid"]["wfo"]
        try:
            wfo = WFO.objects.get(code=WFO.normalize_code(code))
            point["wfo"] = wfo
            weather_story = get_weather_story_from_point_data(point, wfo, localtz)
            if "weatherstory" in point:
                del point["weatherstory"]
        except WFO.DoesNotExist:
            pass

    return render(
        request,
        "weather/point/partials/point-footer.html",
        {"point": point, "weather_story": weather_story},
    )


@require_GET
@never_cache
def wx_point_daily(request, lat, lon):
    """Render the point daily partial view."""
    try:
        point = interop.get_point_forecast(lat, lon)
    except Http504:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.504.interop.heading.01"),
                "body": _("error.504.interop.description.01"),
            },
        )
    except Http429:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {
                "level": "error",
                "heading": _("error.429.interop.heading.01"),
                "body": _("error.429.interop.description.01"),
            },
        )
    except Exception:
        return render(
            request,
            "weather/partials/uswds-alert.html",
            {"level": "error", "body": _("forecast.errors.loading.01")},
        )

    if "grid" in point and "wfo" in point["grid"]:
        from backend.models import WFO  # noqa: PLC0415
        try:
            code = point["grid"]["wfo"]
            wfo = WFO.objects.get(code=WFO.normalize_code(code))
            point["wfo"] = wfo
        except WFO.DoesNotExist:
            pass

    return render(
        request,
        "weather/point/partials/daily.html",
        {"point": point},
    )
