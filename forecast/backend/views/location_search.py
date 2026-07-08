from django.contrib.gis.geos import Point
from django.shortcuts import get_list_or_404, redirect
from django.urls import reverse

from spatial.models import WeatherCounties


def by_county(request, lat, lon): #  noqa: ARG001
    """Attempt to redirect to the county containing the incoming point."""
    point = Point(lon, lat, srid=4326)
    counties = get_list_or_404(WeatherCounties, shape__contains=point)
    target_county = counties[0]
    return redirect(
        reverse("county_overview", kwargs={"countyfips": target_county.countyfips})
    )
