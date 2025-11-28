from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.cache import cache_control

from backend import interop


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the home page."""
    return render(request, "weather/index.html")


def health(_):
    """Return app status for Terraform health checks."""
    response = interop.get_health()
    if "ok" in response and response["ok"]:
        return HttpResponse("OK")
    return HttpResponse("Interop layer is unavailable.", status=503)
