from django.http import Http404
from django.shortcuts import render
from django.views.decorators.cache import cache_control, never_cache

from spatial.models import WeatherStates


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the home page."""
    states = WeatherStates.objects.all().order_by("name")
    return render(request, "weather/state/index.html", {"states": states})


@never_cache
def state_landing(request, state):
    """Render the forecast for a given latitude & longitude."""
    state = WeatherStates.objects.filter(state=state)

    if len(state):
        return render(request, "weather/state/landing.html", {"state": state[0]})

    raise Http404()
