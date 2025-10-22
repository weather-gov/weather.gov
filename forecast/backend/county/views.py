from django.http import Http404
from django.shortcuts import render
from django.views.decorators.cache import cache_control, never_cache

from spatial.models import WeatherCounties


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the county landing page."""
    counties = WeatherCounties.objects.all().order_by("st", "countyname")
    return render(request, "weather/county/index.html", {"counties": counties})


@never_cache
def county_landing(request, countyfips):
    """Render the forecast for a given latitude & longitude."""
    county = WeatherCounties.objects.filter(countyfips=countyfips)

    if len(county):
        return render(request, "weather/county/landing.html", {"county": county[0]})

    raise Http404()
