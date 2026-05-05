from zoneinfo import ZoneInfo

from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_POST

from backend.interop import get_ghwo_data_for_county, get_ghwo_data_for_state
from backend.util import (
    get_basis_for_ghwo_risk,
    get_counties_combo_box_list,
    get_ghwo_daily_images,
    get_states_combo_box_list,
)
from backend.util.county import risk_overview_timestamps_to_dates
from spatial.models import WeatherCounties, WeatherStates


def compute_severity(risk_entry):
    """Compute severity for a GHWO risk entry."""
    return sum(day["category"] for day in risk_entry["days"])

def process_ghwo_data(ghwo_data, localtz): # noqa: C901
    """Add timestamps and additional processing for GHWO data."""
    if "error" not in ghwo_data:
        risk_overview_timestamps_to_dates(ghwo_data, localtz)

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

        ghwo_data["risks"] = dict(
            sorted(ghwo_data["risks"].items(), key=lambda i: compute_severity(i[1]), reverse=True)
        )

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

    return ghwo_data

def risk_details_by_state(request, state_code):
    """Render the risk overview for a given state."""
    state = get_object_or_404(
        WeatherStates,
        state=state_code
    )

    localtz = ZoneInfo("UTC")
    if state.timezone:
        localtz = ZoneInfo(state.timezone)

    # Get all of the states, for use in the combobox dropdown
    states = get_states_combo_box_list(state.state)

    # Now get a list of all counties in state
    counties = get_counties_combo_box_list(state.state)

    # Fetch the GHWO data for the state from the interop layer
    ghwo_data = get_ghwo_data_for_state(state_code)

    # Process and format the GHWO data,
    # adding timezone information as needed
    process_ghwo_data(ghwo_data, localtz)

    return render(
        request,
        "weather/state/ghwo.html",
        {
            "counties": counties,
            "states": states,
            "county": None,
            "state": state,
            "ghwo": ghwo_data
        }
    )

@never_cache
def risk_details_by_county(request, county_fips):
    """Render the risk overview for a specific county."""
    county = get_object_or_404(
        WeatherCounties.objects.select_related("state").only("countyname", "st", "countyfips", "state__state"),
        countyfips=county_fips,
    )

    localtz = ZoneInfo("UTC")
    if county.timezone:
        localtz = ZoneInfo(county.timezone)

    # Get all of the states, for use in the combobox dropdown.
    states = get_states_combo_box_list(county.state.state)

    # Now get a list of all counties in the same state as the found county.
    counties = get_counties_combo_box_list(county.state.state, county_fips)

    # Fetch the GHWO data for the county from the interop layer
    ghwo_data = get_ghwo_data_for_county(county.countyfips)

    # Process GHWO data, adding timezone information
    # as needed
    process_ghwo_data(ghwo_data, localtz)

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
def ghwo_index(request):
    """Redirects to the correct County or State GHWO page given the post data.

    Intended to be used by the <form> element in
    <wx-county-ghwo-selector>
    """
    current_state = request.POST.get("current-state")
    selected_state = request.POST.get("state")
    selected_county = request.POST.get("county")

    try:
        # If the current state does not match the selected state
        # we should redirect to all counties for the selected state.
        # Likewise, if "all" is the selected county value, we are redirecting
        # to all counties for the selected state
        if current_state != selected_state or selected_county == "all":
            state = WeatherStates.objects.get(state=selected_state)
            redirect_link = reverse("state_risk_overview", kwargs={"state_code": state.state})
            # Otherwise, we render as if the selected county
            # is the one we wish to render the form/page for
        else:
            county = WeatherCounties.objects.get(countyfips=selected_county)
            redirect_link = reverse("county_risk_overview", kwargs={"county_fips": county.countyfips})
    except Exception as e:
        raise Http404() from e

    # Redirect to the main county ghwo page for the
    # resolved county
    return redirect(redirect_link)
