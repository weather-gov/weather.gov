from django.shortcuts import render


def deprecated_path(request, **kwargs):
    """Render a 404 for the old URL structures, i.e. /point/lat/lon/, /county/25049/, place/FL/Anywhere/."""
    return render(request, "errors/404/deprecated-path.html", status=404)


def deprecated_office(request, wfo):
    """Render a 404 for the old URL offices structure, i.e. /offices/EAX."""
    return render(request, "errors/404/deprecated-office.html", context={"wfo": wfo}, status=404)


def handle_404(request, exception=None):
    """Handle 404 errors."""
    context = {}

    # If the incoming path is one of the county routes,
    # we will display a custom 404 template for those
    # pages.
    if request.path.startswith("/forecast/county"):
        return render(
            request,
            "errors/404/county-error.html",
            context=context,
            status=404,
        )

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

    # If we didn't render any other 404 handlers, render the generic one.
    return render(
        request,
        "errors/404/generic.html",
        context=context,
        status=404,
    )


def handle_500(request, _=None):
    """Handle 500 errors."""
    return render(
        request,
        "errors/500.html",
        context={},
        status=500,
    )
