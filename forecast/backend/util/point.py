import random

from django.conf import settings

HTMX_A_B_ODDS = 0.5

def should_use_htmx_for_point(request): # noqa: ARG001
    """Return True if we should use HTMX to render the request.

    This function will determine whether or not the given request
    will display a point forecast page in 'HTMX mode', whereby
    other tabs on the page render asynchronously via background
    requests for tab-specific markup.

    If the feature flag for A/B testing is set to True, then we calculate
    the odds (50% for now) and return a value based on those odds.
    In plain English, we want HTMX mode to be on half of the time.
    If the A/B feature flag is not set, then we use the value of the
    explicit HTMX mode feature flag.

    Note that the A/B testing flag will _always_ supersede the
    explicit HTMX mode feature flag.
    """
    # If A/B testing is turned on, use a random to
    # determine if we should trigger the mode
    if settings.POINT_FORECAST_HTMX_A_B:
        # We want to trigger HTMX mode 50% of the
        # time for now
        return random.random() < HTMX_A_B_ODDS # noqa: S311

    # Otherwise, the mode will be set based on the explicit
    # feature flag / env variable
    return settings.POINT_FORECAST_HTMX


def is_htmx_request(request):
    """Return True if the incoming request was made with HTMX header(s)."""
    return request.headers.get("HX-Request") == "true"
