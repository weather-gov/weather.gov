from django.shortcuts import get_object_or_404, render
from django.views.decorators.cache import cache_control, never_cache

from spatial.models import WeatherStates


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the home page."""
    states = WeatherStates.objects.all().order_by("name")
    return render(request, "weather/state/index.html", {"states": states})


@never_cache
def state_overview(request, state):
    """Render the forecast for a given latitude & longitude."""
    state = get_object_or_404(WeatherStates, state=state.upper())
    return render(request, "weather/state/overview.html", {"state": state})
