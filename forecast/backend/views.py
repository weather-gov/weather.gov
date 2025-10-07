from django.conf import settings
from django.http import Http404, HttpResponse
from django.shortcuts import redirect, render
from django.template.loader import render_to_string

from backend import interop
from backend.models import WFO, Region
from backend.util import get_wfo_from_afd
from spatial.models import WeatherPlace


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
        return f"/afd/{wfo.lower()}/{afd_id}"
    if wfo_was_updated:
        return f"/afd/{wfo.lower()}"
    if id_was_updated:
        return f"/afd/{wfo.lower()}/{afd_id}"
    return None


def index(request):
    """Render the home page."""
    return render(request, "weather/index.html")


def point_location(request, lat, lon):
    """Render the forecast for a given latitude & longitude."""
    point = interop.get_point_forecast(lat, lon)
    # TODO: Add some error checking here
    wfo = WFO.objects.get(code=point["grid"]["wfo"])
    point["wfo"] = wfo
    return render(request, "weather/point.html", {"point": point})


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
    url = f"/afd/{wfo.lower()}/{afd_id}"
    return redirect(url)


def afd_by_office(_, wfo):
    """Reroute the user to the correct url for the most recent AFD for the given WFO."""
    try:
        afd_references = interop.get_wx_afd_versions_by_wfo(wfo.upper())["@graph"]
        afd_id = afd_references[0]["id"]
        url = f"/afd/{wfo.lower()}/{afd_id}"
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
            return redirect(f"/afd/{wfo.lower()}/")

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


def health(_request):
    """Return app status for Terraform health checks."""
    response = interop.get_health()
    if "ok" in response and response["ok"]:
        return HttpResponse("OK")
    return HttpResponse("Interop layer is unavailable.", status=503)


# The exception argument is required, but we don't use it so don't QA it.
def handle_404(request, exception=None):  # noqa ARG001
    """Handle 404 errors."""
    context = {}

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
