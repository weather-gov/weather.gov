import json

from django.http import Http404
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.cache import cache_control, never_cache
from django.views.decorators.http import require_POST

from backend import interop
from backend.util import get_counties_combo_box_list, get_states_combo_box_list
from spatial.models import WeatherCounties, WeatherStates


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the county landing page."""
    counties = WeatherCounties.objects.all().order_by("st", "countyname")
    return render(request, "weather/county/index.html", {"counties": counties})


@never_cache
def county_landing(request, countyfips):
    """Render the forecast for a given latitude & longitude."""
    county = WeatherCounties.objects.filter(countyfips=countyfips)

    if len(county):
        county = interop.get_county_data(countyfips)
        return render(request, "weather/county/landing.html", {"data": county})

    raise Http404()


def county_ghwo(request, county_fips):
    """Load a county GHWO details page by FIPS."""
    # Find the county specified by the FIPS.
    # If there is no match, 404 for now
    try:
        county = WeatherCounties.objects.get(countyfips=county_fips)
    except WeatherCounties.DoesNotExist as e:
        raise Http404() from e

    # Get all of the states, for use in the
    # combobox dropdown.
    states = get_states_combo_box_list()

    # Now get a list of all counties in the
    # same state as the found county.
    counties = get_counties_combo_box_list(county.state.fips)

    # Fetch the GHWO data for the county from
    # the interop layer
    try:
        ghwo_data = interop.get_ghwo_data_for_county(county.countyfips)
    except Exception as e:
        raise Http404() from e

    return render(
        request,
        "weather/county/ghwo.html",
        {
            "counties": counties,
            "states": states,
            "county": county,
            "ghwo": json.dumps(ghwo_data, indent=2),
        },
    )


@require_POST
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
