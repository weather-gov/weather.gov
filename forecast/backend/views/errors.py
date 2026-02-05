from django.shortcuts import render

from spatial.models import WeatherPlace


def handle_404(request, exception=None):
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
        if view == "place_forecast":
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
