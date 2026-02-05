from http import HTTPStatus

from django.conf import settings
from django.db.models import Subquery
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.cache import never_cache

from backend import interop
from backend.models import WFO, Region
from backend.util import get_wfo_from_afd
from spatial.models import WeatherCounties, WeatherCountyWarningAreas, WeatherPlace

# from wx_stories_api.models import WeatherStory
from ._helpers import get_redirect_for_afd_queries


@never_cache
def point_location(request, lat, lon):
    """Render the forecast for a given latitude & longitude."""
    # If the latitude or longitude are invalid, bail with an out-of-bounds
    # error. This will result in a 404 page.
    if lat > 90 or lat < -90 or lon < -180 or lon > 180:  # noqa: PLR2004
        raise Http404(
            {
                "error": True,
                "status": 404,
                "reason": "out-of-bounds",
                "point": {
                    "latitude": lat,
                    "longitude": lon,
                },
            },
        )

    point = interop.get_point_forecast(lat, lon)

    if "status" in point and point["status"] == HTTPStatus.NOT_FOUND:
        raise Http404(point)

    # we do not currently support marine.
    if "isMarine" in point and point["isMarine"]:
        return render(request, "weather/marine-point.html", {"point": point})

    weather_story = None
    if "grid" in point and "wfo" in point["grid"]:
        code = point["grid"]["wfo"]
        wfo = WFO.objects.get(code=WFO.normalize_code(code))
        point["wfo"] = wfo
        # TODO: set this back to the real value when wx stories are ready
        # weather_story = WeatherStory.objects.current(wfo).first()
        weather_story = None

    if "update" in request.GET:
        return render(
            request,
            "weather/point.update.html",
            {
                "point": point,
            },
        )

    return render(
        request,
        "weather/point.html",
        {
            "point": point,
            "weather_story": weather_story,
        },
    )


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
    office = get_object_or_404(WFO, code=wfo.upper())

    # Get the counties that intersect the CWA associated with this WFO
    counties = WeatherCounties.objects.filter(
        shape__intersects=Subquery(WeatherCountyWarningAreas.objects.filter(wfo=office.code).values("shape")[:1]),
    ).all()

    # Make a nice, Oxford-comma-delimited list of counties.
    counties = [county.countyname for county in counties]
    if len(counties) > 1:
        last = counties.pop()
        # 2 is not a magic number. It's how many items we need in order to have
        # an Oxford comma. It's not magic, just grammar. Disable the rule.
        counties[-1] = f"{counties[-1]}{',' if len(counties) > 2 else ''} and {last}"  # noqa: PLR2004

    return render(
        request,
        "weather/office.html",
        {
            "office": office,
            "counties": ", ".join(counties),
        },
    )


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
    redirect_url = get_redirect_for_afd_queries(request)
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
    wfo_uppercase = wfo.upper()
    wfo_lowercase = wfo.lower()

    try:
        # Grab the AFD data from the API and determine which
        # WFO it applies to. There might be cases where the user
        # has input an id and wfo into the url, but they do not correspond.
        # We will redirect in cases where this happens.
        afd_data = interop.get_wx_afd_by_id(afd_id)
        afd_wfo = get_wfo_from_afd(afd_data)
        if not afd_wfo or afd_wfo.lower() != wfo_lowercase:
            url = reverse("afd_by_office", kwargs={"wfo": wfo_lowercase})
            return redirect(url)

        # Otherwise, let's grab all the references for the WFO
        # so we can use them in the select dropdown
        afd_references = interop.get_wx_afd_versions_by_wfo(wfo_uppercase)["@graph"]
        all_wfos = WFO.objects.values("code", "name")
        wfo_combo_box_data = [
            {"value": wfo["code"], "selected": wfo["code"] == wfo_uppercase, "text": f"{wfo['name']} ({wfo['code']})"}
            for wfo in all_wfos
        ]

        # Compose a dictionary in the format that the templates expect
        to_render = {
            "wfo": wfo_uppercase,
            "afd": afd_data,
            "wfo_list": wfo_combo_box_data,
            "version_list": afd_references,
        }
    except Exception as e:
        raise Http404() from e
    return render(request, "weather/afd-page.html", to_render)
