import json
from zoneinfo import ZoneInfo

import geobuf
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.template.loader import render_to_string
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from shapely import MultiPolygon, Polygon

from backend import interop
from backend.util import get_counties_combo_box_list, get_states_combo_box_list, process_state_alerts
from backend.views.risk import process_ghwo_data
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
    alerts = WeatherAlertsCache.objects.filter(states__contains=[state_fips]).values(
        "id", "alertjson", "alertkind", "counties", "states", "shape"
    )

    # Loop through all alerts and create set of counties
    all_fips = set()
    for a in alerts:
        if a["counties"]:
            all_fips.update(a["counties"])

    #  Internal Sorting Logic (Ticket #207)
    features = []
    for alert in alerts:
        # Convert directly to a dict without huge string intermediates
        geom_dict = json.loads(alert["shape"].geojson)

        # Internal Sorting Logic
        if geom_dict.get("type") == "MultiPolygon":
            polys = [Polygon(shell=p[0], holes=p[1:]) for p in geom_dict["coordinates"]]
            # Sort by area
            polys.sort(key=lambda a: a.area, reverse=True)
            geom_dict = MultiPolygon(polys).__geo_interface__

        # Build feature manually
        properties = alert["alertjson"]
        properties.pop("geometry", None)

        counties_mapping_count = sum(1 for f in alert["counties"] if str(f).startswith(str(state_fips)))
        properties["total_counties_display"] = counties_mapping_count
        properties["alertkind"] = alert["alertkind"]
        properties["counties"] = alert["counties"]

        features.append({"type": "Feature", "geometry": geom_dict, "properties": properties})

    # Process alerts by sorting by timestamp and severity
    sorted_features = process_state_alerts(features)

    # Encode and return
    pbf_data = geobuf.encode({"type": "FeatureCollection", "features": sorted_features})
    del features

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

    # By default, we assume there is no incoming county
    # (which results in listing all counties)
    county = None

    try:
        # If the current state does not match the selected
        # state, then we assume the state has changed
        # and that we should render the form with data for
        # the new state
        if current_state != selected_state:
            state = WeatherStates.objects.defer("shape").get(state=selected_state)

            # Otherwise, we render as if the selected county
            # is the one we wish to render the form/page for
        elif selected_county != "all":
            county = WeatherCounties.objects.defer("shape").get(countyfips=selected_county)
            state = county.state
        else:
            state = WeatherStates.objects.defer("shape").get(state=current_state)

        # Get the needed state dropdown data
        states = get_states_combo_box_list(selected_state)

        # Get the needed county dropdown data
        if county:
            counties = get_counties_combo_box_list(state.state, county.countyfips)
        else:
            counties = get_counties_combo_box_list(state.state, "")
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

    # Get timezone information
    localtz = ZoneInfo("UTC")
    if county.timezone:
        localtz = ZoneInfo(county.timezone)

    # Fetch the GHWO data for the county
    ghwo_data = interop.get_ghwo_data_for_county(county_fips)

    # Process ghwo data, adding timezone info
    # as needed
    process_ghwo_data(ghwo_data, localtz)

    # Render the partial
    return render(
        request,
        "weather/partials/ghwo-details.html",
        {
            "ghwo": ghwo_data,
            "county": county,
            "state": county.state
        },
    )

@require_GET
@never_cache
def wx_ghwo_all_counties_for_state(request, state_code):
    """Respond with the markup for the GHWO details for the whole state.

    Wil respond with the HTML for a partial only,
    using the state abbrev code provided in the URL
    param.
    """
    state = get_object_or_404(
        WeatherStates.objects.defer("shape"),
        state=state_code
    )

    # Get timezone information
    localtz = ZoneInfo("UTC")
    if state.timezone:
        localtz = ZoneInfo(state.timezone)

    # Fetch GHWO data for the state
    ghwo_data = interop.get_ghwo_data_for_state(state.state)

    # Process ghwo data, adding timezone information
    # as needed
    process_ghwo_data(ghwo_data, localtz)

    # Render the partial
    return render(
        request,
        "weather/partials/ghwo-details.html",
        {
            "ghwo": ghwo_data,
            "county": None,
            "state": state,
        }
    )
