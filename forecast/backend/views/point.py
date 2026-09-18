from functools import wraps
from http import HTTPStatus
from zoneinfo import ZoneInfo

from django.conf import settings
from django.http import Http404, HttpResponse
from django.shortcuts import redirect, render
from django.template.loader import render_to_string
from django.urls import reverse
from django.views.decorators.cache import cache_control
from django.views.decorators.vary import vary_on_headers

from backend import interop
from backend.models import WFO
from backend.util import get_weather_story_from_point_data, get_wfo_from_afd
from backend.util.point import is_htmx_request, should_use_htmx_for_point
from spatial.models import WeatherPlace

from ._helpers import get_redirect_for_afd_queries

MAX_DEGREE_DECIMALS = 3

def decimal_redirect(view_func):
    """Wrap any point location view handler to limit lat/lon decimals."""
    @wraps(view_func)
    def _decimal_redirect(request, lat, lon):
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
            return redirect(f"/forecast/point/{lat}/{lon}/")

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

        return view_func(request, lat, lon)
    return _decimal_redirect

@cache_control(max_age=120, smax_age=120, public=True)
@decimal_redirect
def point_location(request, lat, lon):  # noqa: C901
    """Render the forecast for a given latitude & longitude."""
    allow_coastal = settings.MARINE_COASTAL_EXPERIMENTAL

    point = interop.get_point_forecast(lat, lon)
    fullname = point.get("place", {}).get("fullName", None)

    # Check if there was an error retrieving alerts from the cache/background process
    alerts_error = point.get("alerts", {}).get("metadata", {}).get("error", False)

    context = {"point": point, "alerts_error": alerts_error, "title_trans_args": {"fullName": fullname}}

    if "status" in point and point["status"] == HTTPStatus.NOT_FOUND:
        raise Http404(point)

    # If a marine point, check if coastal is allowed, else block all marine
    if "grid" in point and "type" in point["grid"] and point["grid"]["type"] == "marine":
        if not (allow_coastal and point["grid"].get("marineType") == "coastal"):
            return render(request, "errors/404/marine-point.html", context, status=404)

    # If there is not latitude and longitude data in the returned
    # point dict, we need to add it from the url params
    if "point" not in point:
        point["point"] = {"latitude": lat, "longitude": lon}
    elif "latitude" not in point["point"] or "longitude" not in point["point"]:
        point["point"]["latitude"] = lat
        point["point"]["longitude"] = lon

    # If there are alerts for this point location, redirect to the alerts
    # tab page
    alert_items = point.get("alerts", {}).get("items", [])
    if len(alert_items) > 0:
        return redirect(
            reverse(
                "point_forecast_alerts",
                kwargs={
                    "lat": lat,
                    "lon": lon,
                }
            )
        )

    # Otherwise, we redirect to the today tab
    return redirect(
        reverse(
            "point_forecast_today",
            kwargs={
                "lat": lat,
                "lon": lon,
            }
        )
    )

@cache_control(max_age=120, smax_age=120, public=True)
@decimal_redirect
@vary_on_headers("HX-Request")
def point_location_alerts(request, lat, lon):
    """Render alerts at the specific points location."""
    use_htmx = should_use_htmx_for_point(request)
    # For now, simply retrieve the whole point forecast from
    # the interop.
    # TODO: in the future, either fetch the point information
    # from the db directly from Django, or create a smaller
    # interop endpoint for retrieving only the information we need
    # for this endpoint
    allow_coastal = settings.MARINE_COASTAL_EXPERIMENTAL
    point = interop.get_point_forecast(lat, lon)
    fullname = point.get("place", {}).get("fullName", None)

    # Check if there was an error retrieving alerts from the cache/background process
    alerts_error = point.get("alerts", {}).get("metadata", {}).get("error", False)

    context = {
        "point": point,
        "alerts_error": alerts_error,
        "title_trans_args": {"fullName": fullname},
        "use_htmx": use_htmx,
    }

    if "status" in point and point["status"] == HTTPStatus.NOT_FOUND:
        raise Http404(point)

    # If a marine point, check if coastal is allowed, else block all marine
    if "grid" in point and "type" in point["grid"] and point["grid"]["type"] == "marine":
        if not (allow_coastal and point["grid"].get("marineType") == "coastal"):
            return render(request, "errors/404/marine-point.html", context, status=404)

    # If there is not latitude and longitude data in the returned
    # point dict, we need to add it from the url params
    if "point" not in point:
        point["point"] = {"latitude": lat, "longitude": lon}
    elif "latitude" not in point["point"] or "longitude" not in point["point"]:
        point["point"]["latitude"] = lat
        point["point"]["longitude"] = lon

    # If there are no alerts for this location, redirect to the today tab
    alert_items = point.get("alerts", {}).get("items", [])
    if len(alert_items) == 0:
        return redirect(
            reverse(
                "point_forecast_today",
                kwargs={
                    "lat": lat,
                    "lon": lon,
                }
            )
        )

    if is_htmx_request(request):
        # In this case, we only render and return the partial
        # we need for alert tab content
        markup = render_to_string("weather/point/alerts-tab-content.html", {
            "alerts": alert_items,
        })
        return HttpResponse(markup, content_type="text/html")

    if use_htmx:
        # Render the template that has the "htmx-enabled"
        # version of the page
        return render(
            request,
            "weather/point/alerts-with-htmx.html",
            {
                **context,
            }
        )

    return render(
        request,
        "weather/point/alerts.html",
        {
            **context,
        },
    )


@cache_control(max_age=120, smax_age=120, public=True)
@decimal_redirect
@vary_on_headers("HX-Request")
def point_location_today(request, lat, lon): # noqa: C901
    """Render the today tab page for the point location."""
    use_htmx = should_use_htmx_for_point(request)
    allow_coastal = settings.MARINE_COASTAL_EXPERIMENTAL

    point = interop.get_point_forecast(lat, lon)
    fullname = point.get("place", {}).get("fullName", None)

    # Check if there was an error retrieving alerts from the cache/background process
    alerts_error = point.get("alerts", {}).get("metadata", {}).get("error", False)

    context = {
        "point": point,
        "alerts_error": alerts_error,
        "title_trans_args": {"fullName": fullname},
        "use_htmx": use_htmx,
    }

    if "status" in point and point["status"] == HTTPStatus.NOT_FOUND:
        raise Http404(point)

    # If a marine point, check if coastal is allowed, else block all marine
    if "grid" in point and "type" in point["grid"] and point["grid"]["type"] == "marine":
        if not (allow_coastal and point["grid"].get("marineType") == "coastal"):
            return render(request, "errors/404/marine-point.html", context, status=404)

    # If there is not latitude and longitude data in the returned
    # point dict, we need to add it from the url params
    if "point" not in point:
        point["point"] = {"latitude": lat, "longitude": lon}
    elif "latitude" not in point["point"] or "longitude" not in point["point"]:
        point["point"]["latitude"] = lat
        point["point"]["longitude"] = lon

    # Get the local timezone for the current point place
    # If there was an error retrieving the place API endpoint,
    # we set to None
    # NOTE: If we permanently remove generated timestamps
    # from the weather stories, we can safely remove this timezone
    # code, which is only used for that purpose currently
    if "place" in point and "timezone" in point["place"]:
        localtz = ZoneInfo(point["place"]["timezone"])
    else:
        localtz = None

    weather_story = {}
    if "grid" in point and "wfo" in point["grid"] and localtz:
        code = point["grid"]["wfo"]
        wfo = WFO.objects.get(code=WFO.normalize_code(code))
        point["wfo"] = wfo
        point["isAlaska"] = wfo.code.lower() in ["afc", "afg", "ajk"]

        # Pull the weather story data out of the point interop response
        # and format the timestamps / handle errors as needed.
        weather_story = get_weather_story_from_point_data(point, wfo, localtz)

        # Remove the reference to the raw weatherstory data from
        # the point dictionary. We will pull this out a level in the render
        # call below, into its own top level key/variable
        del point["weatherstory"]

    if "update" in request.GET:
        return render(
            request,
            "weather/point/point.update.html",
            context,
        )

    if is_htmx_request(request):
        # In this case, only render the partial needed
        # for the tab content
        markup = render_to_string("weather/point/today-tab-content.html", {
            "weather_story": weather_story,
            **context,
        })
        return HttpResponse(markup, content_type="text/html")

    if use_htmx:
        # Render the template that has the "htmx-enabled"
        # version of the page
        return render(
            request,
            "weather/point/today-with-htmx.html",
            {
                "weather_story": weather_story,
                **context,
            }
        )

    return render(
        request,
        "weather/point/today.html",
        {
            **context,
            "weather_story": weather_story,
        },
    )


@cache_control(max_age=120, smax_age=120, public=True)
@decimal_redirect
@vary_on_headers("HX-Request")
def point_location_seven_day(request, lat, lon): # noqa: C901
    """Render the 7-day detailed forecast for the point location."""
    use_htmx = should_use_htmx_for_point(request)
    allow_coastal = settings.MARINE_COASTAL_EXPERIMENTAL


    point = interop.get_point_forecast(lat, lon)
    fullname = point.get("place", {}).get("fullName", None)

    # Check if there was an error retrieving alerts from the cache/background process
    alerts_error = point.get("alerts", {}).get("metadata", {}).get("error", False)

    context = {
        "point": point,
        "alerts_error": alerts_error,
        "title_trans_args": {"fullName": fullname},
        "use_htmx": use_htmx,
    }

    if "status" in point and point["status"] == HTTPStatus.NOT_FOUND:
        raise Http404(point)

    # If a marine point, check if coastal is allowed, else block all marine
    if "grid" in point and "type" in point["grid"] and point["grid"]["type"] == "marine":
        if not (allow_coastal and point["grid"].get("marineType") == "coastal"):
            return render(request, "errors/404/marine-point.html", context, status=404)

    # If there is not latitude and longitude data in the returned
    # point dict, we need to add it from the url params
    if "point" not in point:
        point["point"] = {"latitude": lat, "longitude": lon}
    elif "latitude" not in point["point"] or "longitude" not in point["point"]:
        point["point"]["latitude"] = lat
        point["point"]["longitude"] = lon

    # Get the local timezone for the current point place
    # If there was an error retrieving the place API endpoint,
    # we set to None
    # NOTE: If we permanently remove generated timestamps
    # from the weather stories, we can safely remove this timezone
    # code, which is only used for that purpose currently
    if "place" in point and "timezone" in point["place"]:
        localtz = ZoneInfo(point["place"]["timezone"])
    else:
        localtz = None

    if "grid" in point and "wfo" in point["grid"] and localtz:
        code = point["grid"]["wfo"]
        wfo = WFO.objects.get(code=WFO.normalize_code(code))
        point["wfo"] = wfo
        point["isAlaska"] = wfo.code.lower() in ["afc", "afg", "ajk"]


    if is_htmx_request(request):
        # In this case, only render the partial markup
        # needed for the tab's content
        markup = render_to_string(
            "weather/point/seven-day-tab-content.html",
            {
                "use_htmx": True,
                "forecast": context["point"]["forecast"],
                **context,
            })
        return HttpResponse(markup, content_type="text/html")

    if use_htmx:
        # Render the template that has the "htmx-enabled"
        # version of the page
        return render(
            request,
            "weather/point/seven-day-with-htmx.html",
            {
                **context,
            }
        )

    return render(
        request,
        "weather/point/seven-day.html",
        {
            **context,
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

    # Otherwise, we render a version of the page with the first
    # alphabetical WFO and its most recent AFD, but without the body
    # of the AFD displayed
    all_wfos = WFO.objects.order_by("name").values("code", "name")
    first_wfo = all_wfos[0]
    wfo_combo_box_data = [
        {
            "value": wfo["code"],
            "selected": wfo["code"] == first_wfo["code"].upper(),
            "text": f"{wfo['name']} ({wfo['code']})",
        }
        for wfo in all_wfos
    ]
    afd_references = interop.get_wx_afd_versions_by_wfo(all_wfos[0]["code"].upper())["@graph"]
    to_render = {
        "wfo": all_wfos[0]["code"].upper(),
        "afd": None,
        "wfo_list": wfo_combo_box_data,
        "version_list": afd_references,
        "title_trans_args": {"wfo": all_wfos[0]["code"].upper(), "afd_id": afd_references[0]["id"]},
    }
    return render(request, "weather/afd/afd_page.html", to_render)


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
        all_wfos = WFO.objects.order_by("name").values("code", "name")
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
            "title_trans_args": {
                "wfo": wfo_uppercase,
                "afd_id": afd_id,
            },
        }
    except Exception as e:
        raise Http404() from e
    return render(request, "weather/afd/afd_page.html", to_render)
