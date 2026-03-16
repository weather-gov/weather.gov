from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Subquery
from django.http import Http404
from django.shortcuts import get_object_or_404, render

from backend.models import WFO, Region
from backend.util.nwsconnect import get_office_briefing
from spatial.models import WeatherCounties, WeatherCountyWarningAreas


def offices(request):  # pragma: no cover
    """Render a list of all WFOs. This is a debug route."""
    if not settings.DEBUG:
        raise Http404()
    regions = []
    for region in Region.objects.all():
        entry = {"id": region.id, "name": region.name, "weight": region.weight, "wfos": []}
        wfos = region.wfos.all()
        for wfo in wfos:
            wfo_entry = {"id": wfo.code.upper(), "name": wfo.name, "weight": wfo.weight}
            entry["wfos"].append(wfo_entry)
        regions.append(entry)

    return render(request, "weather/office/index.html", {"regions": regions})


def offices_specific(request, wfo):
    """Render the home page for an individual Weather Forecast Office."""
    office = get_object_or_404(WFO, code=wfo.upper())

    # Get the counties that intersect the CWA associated with this WFO
    counties = WeatherCounties.objects.filter(
        shape__intersects=Subquery(WeatherCountyWarningAreas.objects.filter(wfo=office.code).values("shape")[:1]),
    ).all()

    # Make a nice, Oxford-comma-delimited list of counties.
    counties = [county.countyname for county in counties]
    if len(counties) > 1:
        last = counties.pop()
        # 2 is not a magic number. It's how many items we need in order to have
        # an Oxford comma. It's not magic, just grammar. Disable the rule.
        counties[-1] = f"{counties[-1]}{',' if len(counties) > 2 else ''} and {last}"  # noqa: PLR2004

    briefing = get_office_briefing(office, ZoneInfo("UTC"))

    return render(
        request,
        "weather/office/overview.html",
        {"office": office, "counties": ", ".join(counties), "briefing": briefing},
    )
