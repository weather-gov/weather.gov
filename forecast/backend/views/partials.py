from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.template.loader import render_to_string
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from backend import interop
from backend.util import get_counties_combo_box_list, get_states_combo_box_list
from spatial.models import WeatherCounties, WeatherStates


@never_cache
def wx_afd_id(_, afd_id):
    """Return _markup only_ for a single parsed AFD product by id."""
    data = interop.get_wx_afd_by_id(afd_id)
    markup = render_to_string("weather/wx/afd.html", {"afd": data})
    return HttpResponse(markup, content_type="text/html")


@never_cache
def wx_afd_versions(_, wfo):
    """Return _markup only_ for the versions of AFDs for the given forecast office."""
    data = interop.get_wx_afd_versions_by_wfo(wfo)
    markup = render_to_string("weather/wx/afd-versions-select.html", {"version_list": data["@graph"]})
    return HttpResponse(markup, content_type="text/html")


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
    selected_state = request.POST.get("state-select")
    selected_county = request.POST.get("county-select")

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
        states = get_states_combo_box_list()

        # Get the needed county dropdown data
        counties = get_counties_combo_box_list(state.fips)
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
