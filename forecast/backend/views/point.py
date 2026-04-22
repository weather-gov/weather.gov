from django.http import Http404
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.cache import cache_control

from backend import interop
from backend.models import WFO
from backend.util import get_wfo_from_afd
from spatial.models import WeatherPlace
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance

from ._helpers import get_redirect_for_afd_queries

MAX_DEGREE_DECIMALS = 3


@cache_control(max_age=120, smax_age=120, public=True)
def point_location(request, lat, lon):  # noqa: C901
    """Render the forecast for a given latitude & longitude."""
    # If there are more than 3 decimal places in the latitude, we redirect.
    # We determine whether to redirect based on the number of decimal points
    # given to us, rather than rounding and then comparing, to avoid any
    # weird floating-point math goof-ups.
    [whole, decimal] = f"{lat}".split(".")
    decimal_redirect = decimal and len(decimal) > MAX_DEGREE_DECIMALS

    # Or if there are more than 3 decimal places in the longitude
    if not decimal_redirect:
        [whole, decimal] = f"{lon}".split(".")
        decimal_redirect = decimal and len(decimal) > MAX_DEGREE_DECIMALS

    if decimal_redirect:
        # Round them both to 3 decimal places and carry on
        lat = float(f"{lat:.3f}")
        lon = float(f"{lon:.3f}")
        return redirect(f"/point/{lat}/{lon}/")

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

    if "update" in request.GET:
        # For radar updates, we only need radar metadata, but currently point updates
        # fetch everything. We leave this as is since radar update may be refactored later,
        # or we just fetch the interop point here.
        point = interop.get_point_forecast(lat, lon)
        return render(
            request,
            "weather/point/point.update.html",
            {
                "point": point,
            },
        )

    # Fetch the approximate nearest place for the skeleton `<title>` and place banner
    point_geom = Point(lon, lat, srid=4326)
    nearest_place = WeatherPlace.objects.annotate(distance=Distance("point", point_geom)).order_by("distance").first()
    
    approximate_name = "Unknown Location"
    if nearest_place:
        approximate_name = f"{nearest_place.name}, {nearest_place.state}"

    # Instead of fetching interop synchronously, return the wrapper for lazy loading.
    return render(
        request,
        "weather/point/overview.html",
        {
            "lat": lat,
            "lon": lon,
            "approximate_name": approximate_name,
        },
    )


@cache_control(max_age=120, smax_age=120, public=True)
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
        # on the location of the place. Round lat and lon to 3 decimal places first.
        lat = float(f"{known_place.point.y:.3f}")
        lon = float(f"{known_place.point.x:.3f}")

        return point_location(request, lat, lon)

    # If it's not a place we know, 404.
    raise Http404()


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
    return render(request, "weather/afd/afd_page.html", to_render)
