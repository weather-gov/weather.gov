import logging

from django.shortcuts import get_object_or_404, render
from django.views.decorators.cache import cache_control

from spatial.models import WeatherZone

logger = logging.getLogger(__name__)


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the coastal search index page."""
    coastal_zones = WeatherZone.objects.defer(
        "shape").filter(type__exact="marine:coastal")

    return render(request, "weather/coastal/index.html", {"coastal_zones": coastal_zones})

@cache_control(max_age=120, smax_age=120, public=True)
def coastal_alerts(request, zone_id):
    """Render the coastal zone alert page."""
    # Currently querying with endswith until column with zone_id is ready
    zone = get_object_or_404(WeatherZone.objects.defer(
        "shape"), id__endswith=zone_id.upper(), type__exact="marine:coastal")
    return render(request, "weather/coastal/alerts.html",
                  {"zone_id": zone_id, "zone": zone, "title_trans_args": {"zone": zone_id} })

@cache_control(max_age=120, smax_age=120, public=True)
def coastal_forecast(request, zone_id):
    """Render the coastal zone forecast page."""
    zone = get_object_or_404(WeatherZone.objects.defer(
        "shape"), id__endswith=zone_id.upper(), type__exact="marine:coastal")
    return render(request, "weather/coastal/forecast.html",
                  {"zone_id": zone_id, "zone": zone, "title_trans_args": {"zone": zone_id}})

@cache_control(max_age=120, smax_age=120, public=True)
def coastal_conditions(request, zone_id):
    """Render the coastal zone conditions page."""
    zone = get_object_or_404(WeatherZone.objects.defer(
        "shape"), id__endswith=zone_id.upper(), type__exact="marine:coastal")
    return render(request, "weather/coastal/conditions.html",
                  {"zone_id": zone_id, "zone": zone, "title_trans_args": {"zone": zone_id}})
