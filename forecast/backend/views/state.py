from django.shortcuts import get_object_or_404, render
from django.views.decorators.cache import cache_control

from spatial.models import WeatherStates


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the state search and index page."""
    states = WeatherStates.objects.all().order_by("name")
    return render(request, "weather/state/index.html", {"states": states})


@cache_control(max_age=120, smax_age=120, public=True)
def state_alerts(request, state):
    """Render the alerts tab for a given state. This is the default view."""
    state = get_object_or_404(WeatherStates, state=state.upper())
    return render(request, "weather/state/alerts.html", {"state": state})


@cache_control(max_age=120, smax_age=120, public=True)
def state_risks(request, state):
    """Render the risks tab for a given state."""
    state = get_object_or_404(WeatherStates, state=state.upper())
    return render(request, "weather/state/risks.html", {"state": state})


@cache_control(max_age=120, smax_age=120, public=True)
def state_radar(request, state):
    """Render the radar tab for a given state."""
    state = get_object_or_404(WeatherStates, state=state.upper())
    return render(request, "weather/state/radar.html", {"state": state})


@cache_control(max_age=120, smax_age=120, public=True)
def state_analysis(request, state):
    """Render the analysis tab for a given state."""
    state = get_object_or_404(WeatherStates, state=state.upper())
    return render(request, "weather/state/analysis.html", {"state": state})
