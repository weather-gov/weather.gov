import json

from django.conf import settings
from django.http import Http404, HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import cache_control, never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from backend import interop
from backend.models import WFO, Region
from backend.util import get_counties_combo_box_list, get_states_combo_box_list, get_wfo_from_afd
from spatial.models import WeatherCounties, WeatherPlace, WeatherStates

HTTP404 = 404


# Helpers
def _get_redirect_for_afd_queries(request):
    """
    Pull out querystring values from a request to /afd.

    Given a request to the index /afd endpoint,
    attempt to pull out any querystring values.
    If they are present, this means the update form
    was submitted, and we should process a redirect.
    Return the redirect url string.
    Otherwise, return None.
    """
    # These two are passed from select/combobox
    # input values on an AFD page
    wfo = request.GET.get("wfo", None)
    afd_id = request.GET.get("id", None)

    # These two are always present on the full AFD page
    # as hidden inputs. When the page is rendered, they
    # hold what the page's initial WFO and AFD id values
    # were before any select/combobox selections.
    current_wfo = request.GET.get("current-wfo", None)
    current_afd_id = request.GET.get("current-id", None)

    wfo_was_updated = wfo != current_wfo
    id_was_updated = afd_id != current_afd_id
    if wfo_was_updated and id_was_updated:
        return reverse("afd_by_office_and_id", kwargs={"wfo": wfo.lower(), "afd_id": afd_id})
    if wfo_was_updated:
        return reverse("afd_by_office", kwargs={"wfo": wfo.lower()})
    if id_was_updated:
        return reverse("afd_by_office_and_id", kwargs={"wfo": wfo.lower(), "afd_id": afd_id})
    return None


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the home page."""
    return render(request, "weather/index.html")


def site_page(request):
    """Render one of the main static site pages.

    These include things like the about page,
    site map, disclaimer, etc
    """
    tokens = [t for t in request.path.split("/") if t != ""]
    name = tokens[-1]
    name = name.replace("_", "-")
    locale_id = f"site.meta.titles.{name}.01"
    page = {
        "title": _(locale_id),
    }
    context = {"page": page}

    return render(request, f"weather/{name}.html", context)


@never_cache
def point_location(request, lat, lon):
    """Render the forecast for a given latitude & longitude."""
    point = interop.get_point_forecast(lat, lon)

    # The QA check is for 404 being a "magic value," which it kind of is, but
    # within this context, it's a very well-known one. Anyway, if we get a 404
    # from point forecast, we can raise it as a 404 exception and let our 404
    # handler handle it. (See how clear "404" is in this context?!)
    if "status" in point and point["status"] == 404:  # noqa: PLR2004
        raise Http404(point)

    # TODO: Add some error checking here
    wfo = WFO.objects.get(code=point["grid"]["wfo"])
    point["wfo"] = wfo

    if point["isMarine"]:
        return render(request, "weather/marine-point.html", {"point": point})

    return render(request, "weather/point.html", {"point": point})


@never_cache
def place_forecast(request, state, place):
    """Render the forecast for a given state and place name."""
    # De-normalize the place name. For the purposes of clean URLs, we
    # replace spaces with underscores and slahes with commas in place names.
    # There are no places with underscores or commas in their names as of
    # the time of this comment. We need the de-normalized name in order to
    # our query.
    denormalized_place = place.replace("_", " ").replace(",", "/")

    known_place = WeatherPlace.objects.filter(
        state__iexact=state,
        name__iexact=denormalized_place,
    ).first()

    # If this is a place we know about...
    if known_place is not None:
        # If the requested place name has a space or slash in it, then we need
        # to redirect them to a normalized URL.
        normalize_redirect = " " in place or "/" in place

        # If the input name is not normalized, or if the input state or name
        # do not exactly match the known place, redirect to the normalized URL
        do_redirect = normalize_redirect or known_place.state != state or known_place.name != denormalized_place

        if do_redirect:
            # Get the expected place name from the model so the capitalization
            # and whatnot are correct, then normalized. And keep the state from
            # the model.
            place = known_place.name.replace(" ", "_").replace("/", ",")
            return redirect(f"/place/{known_place.state}/{place}/")

        # If we don't need to redirect, then just show them their forecast based
        # on the location of the place.
        return point_location(request, known_place.point.y, known_place.point.x)

    # If it's not a place we know, 404.
    raise Http404()


def offices(request):  # pragma: no cover
    """Render a list of all WFOs. This is a debug route."""
    if not settings.DEBUG:
        raise Http404()
    regions = []
    for region in Region.objects.all():
        entry = {"id": region.id, "name": region.name, "weight": region.weight, "wfos": []}
        wfos = region.wfos.all()
        for wfo in wfos:
            wfo_entry = {"id": wfo.code.upper(), "name": wfo.name, "weight": wfo.weight}
            entry["wfos"].append(wfo_entry)
        regions.append(entry)

    return render(request, "weather/offices.html", {"regions": regions})


def offices_specific(request, wfo):
    """Render the home page for an individual Weather Forecast Office."""
    office = WFO.objects.get(code=wfo.upper())
    return render(request, "weather/office.html", {"office": office})


def afd_index(request):
    """
    Reroute the user to the correct url for the most recent AFD at _any_ WFO.

    If there are querystring values for the wfo and
    a given afd_id, then we redirect to the correct
    url for that page
    """
    # First, we see if there are querystring values for
    # the WFO and the current/requested AFD id.
    # If the current id (what was being viewed) and
    # the selected id are different, that means we are
    # requesting a new AFD id.
    # Otherwise, if there is a WFO present, we
    # will redirect to the route for the most recent
    # AFD at that location.
    redirect_url = _get_redirect_for_afd_queries(request)
    if redirect_url:
        return redirect(redirect_url)

    # Otherwise, we get the most recent AFD from anywhere
    # in the country, determine the WFO to which it applies,
    # and we redirect to the full url for that resource
    afd_references = interop.get_wx_afd_versions()["@graph"]
    afd_id = afd_references[0]["id"]
    afd_data = interop.get_wx_afd_by_id(afd_id)
    wfo = get_wfo_from_afd(afd_data)
    url = reverse("afd_by_office_and_id", kwargs={"wfo": wfo.lower(), "afd_id": afd_id})
    return redirect(url)


def afd_by_office(_, wfo):
    """Reroute the user to the correct url for the most recent AFD for the given WFO."""
    try:
        afd_references = interop.get_wx_afd_versions_by_wfo(wfo.upper())["@graph"]
        afd_id = afd_references[0]["id"]
        url = reverse("afd_by_office_and_id", kwargs={"wfo": wfo.lower(), "afd_id": afd_id})
        return redirect(url)
    except Exception as e:
        raise Http404() from e


def afd_by_office_and_id(request, wfo, afd_id):
    """Display the given AFD product by id and populate the list of available AFDs for the provided WFO."""
    try:
        # Grab the AFD data from the API and determine which
        # WFO it applies to. There might be cases where the user
        # has input an id and wfo into the url, but they do not correspond.
        # We will redirect in cases where this happens.
        afd_data = interop.get_wx_afd_by_id(afd_id)
        afd_wfo = get_wfo_from_afd(afd_data)
        if not afd_wfo or afd_wfo.lower() != wfo.lower():
            url = reverse("afd_by_office", kwargs={"wfo": wfo.lower()})
            return redirect(url)

        # Otherwise, let's grab all the references for the WFO
        # so we can use them in the select dropdown
        afd_references = interop.get_wx_afd_versions_by_wfo(wfo.upper())["@graph"]
        all_wfos = WFO.objects.values("code", "name")
        wfo_combo_box_data = [{"value": wfo["code"], "text": f"{wfo['name']} ({wfo['code']})"} for wfo in all_wfos]

        # Compose a dictionary in the format that the templates expect
        to_render = {
            "wfo": wfo.upper(),
            "afd": afd_data,
            "wfo_list": wfo_combo_box_data,
            "version_list": afd_references,
        }
    except Exception as e:
        raise Http404() from e
    return render(request, "weather/afd-page.html", to_render)


def wx_afd_id(_, afd_id):
    """Return _markup only_ for a single parsed AFD product by id."""
    data = interop.get_wx_afd_by_id(afd_id)
    markup = render_to_string("weather/wx/afd.html", {"afd": data})
    return HttpResponse(markup, content_type="text/html")


def wx_afd_versions(_, wfo):
    """Return _markup only_ for the versions of AFDs for the given forecast office."""
    data = interop.get_wx_afd_versions_by_wfo(wfo)
    markup = render_to_string("weather/wx/afd-versions-select.html", {"version_list": data["@graph"]})
    return HttpResponse(markup, content_type="text/html")

def wx_select_state_counties(_request, state_fips):
    """Respond with a list of combo-box items in JSON for counties in the given state."""
    results = []
    for county in WeatherCounties.objects.filter(state__fips=state_fips).order_by("countyname"):
        results.append({
            "text": f"{county.countyname}, {county.state.state}",
            "value": county.countyfips,
        })

    return JsonResponse({
        "stateFips": state_fips,
        "state": county.state.state,
        "items": results,
    })

def health(_request):
    """Return app status for Terraform health checks."""
    response = interop.get_health()
    if "ok" in response and response["ok"]:
        return HttpResponse("OK")
    return HttpResponse("Interop layer is unavailable.", status=503)


# The exception argument is required, but we don't use it so don't QA it.
def handle_404(request, exception=None):  # noqa: ARG001
    """Handle 404 errors."""
    context = {}

    # If there were arguments passed into the 404 exception, there might be
    # information in there that helps us deliver a more targeted error page.
    if exception and len(exception.args) > 0:
        args = exception.args[0]
        # If we got a reason of out-of-bounds, then this point is outside the
        # United States, in which case there will never be NWS data.
        if "reason" in args and args["reason"] == "out-of-bounds":
            return render(
                request,
                "errors/404/point-out-of-bounds.html",
                context=args,
                status=404,
            )

        # If the reason is not-supported, then the point is within the NWS's
        # jurisdiction but data isn't available from the API for whatever
        # reason. For example, we see this with American Samoa and some of the
        # smaller territorial islands.
        if "reason" in args and args["reason"] == "not-supported":
            return render(
                request,
                "errors/404/point-not-supported.html",
                context=args,
                status=404,
            )

    # If there is a resolver match, then one of our handlers raised this 404.
    # There may be some special handling we can do.
    if request.resolver_match:
        view = request.resolver_match.view_name

        # For place forecasts, we might be able to find an alternative to
        # suggest to the user.
        if view == "place forecast":
            # Denormalize, just in case.
            place = request.resolver_match.kwargs["place"].replace("_", " ").replace(",", "/")
            state = request.resolver_match.kwargs["state"].upper()

            # Add the place that was requested to the context so we can access
            # it in the template.
            context["requested"] = {
                "place": place,
                "state": state.upper(),
            }

            # See if we have any near matches. If we do, we can suggest it.
            maybe_place = WeatherPlace.get_nearest_match(state, place)
            if maybe_place:
                context["suggested"] = {
                    "place": f"{maybe_place.name}, {maybe_place.state}",
                    "url": "/"
                    + request.resolver_match.route.replace(
                        "<state>",
                        maybe_place.state,
                    ).replace(
                        "<place>",
                        maybe_place.name.replace(" ", "_").replace("/", ","),
                    ),
                }

            return render(
                request,
                "errors/404/place-forecast.html",
                context=context,
                status=404,
            )

    # If we didn't render any other 404 handlers, render the generic one.
    return render(
        request,
        "errors/404/generic.html",
        context=context,
        status=404,
    )


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
            county = WeatherCounties.objects.filter(
                state__id=state.id,
            ).order_by("countyname").first()
            # Otherwise, we render as if the selected county
            # is the one we wish to render the form/page for
        else:
            county = WeatherCounties.objects.get(countyfips=selected_county)
    except Exception as e:
        raise Http404() from e

    # Redirect to the main county ghwo page for the
    # resolved county
    return redirect(
        reverse(
            "county_ghwo",
            kwargs={"county_fips": county.countyfips}),
    )


@require_POST
@csrf_exempt
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
            state = WeatherStates.objects.get(fips=selected_state)
            county = WeatherCounties.objects.filter(
                state__id=state.id,
            ).order_by("countyname").first()
            # Otherwise, we render as if the selected county
            # is the one we wish to render the form/page for
        else:
            county = WeatherCounties.objects.get(countyfips=selected_county)
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
def wx_ghwo_counties(request, county_fips):
    """Respond with markup for the County GHWO details.

    Will respond with the HTML for a partial only,
    using the county FIPS code provided in the
    URL param.
    """
    try:
        county = WeatherCounties.objects.get(countyfips=county_fips)

        # Fetch the GHWO data for the county
        ghwo_data = interop.get_ghwo_data_for_county(county_fips)

        # Render the partial
        return render(
            request,
            "weather/partials/ghwo-details.html",
            {
                "ghwo": json.dumps(ghwo_data, indent=2),
                "county": county,
            },
        )
    except Exception as e:
        # We assume the interop could not properly
        # fetch the GHWO for the location
        raise Http404() from e
