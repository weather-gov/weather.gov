from django.conf import settings


def should_use_htmx_for_point(request): # noqa: ARG001
    """Return True if we should use HTMX to render the request.

    This function will determine whether or not the given request
    will display a point forecast page in 'HTMX mode', whereby
    other tabs on the page render asynchronously via background
    requests for tab-specific markup.

    We anticipate that we will use some variant of a/b testing in
    the future, so there might be some statistical determination
    when computing this value at that point.

    For now, we only use a feature flag that has updated the
    settings.
    """
    return settings.POINT_FORECAST_HTMX


def is_htmx_request(request):
    """Return True if the incoming request was made with HTMX header(s)."""
    return request.headers.get("HX-Request") == "true"
