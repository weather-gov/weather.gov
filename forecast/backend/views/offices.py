import json
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import Func, Subquery, TextField
from django.http import Http404
from django.shortcuts import get_object_or_404, render

from backend.models import WFO, Region
from backend.util.nwsconnect import get_office_briefing
from backend.views.county import GEOMETRY_BINARY_THRESHOLD
from spatial.models import WeatherCounties, WeatherCountyWarningAreas

# Unsimplified, the coastal offices run to 6MB of GeoJSON
CWA_SIMPLIFICATION_METERS = 1000
CWA_COORDINATE_PRECISION = 5


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
    context = {"regions": regions}

    return render(request, "weather/office/index.html", context)


def get_cwa_shape(wfo_code):
    """Fetch a CWA boundary as simplified GeoJSON."""
    # Simplifying in the database keeps the full-resolution shape out of Python
    shape = (
        WeatherCountyWarningAreas.objects.filter(wfo=wfo_code)
        .annotate(
            geojson=Func(
                "shape",
                function="ST_AsGeoJSON",
                template=(
                    "%(function)s(ST_Transform(ST_SimplifyPreserveTopology("
                    f"ST_Transform(%(expressions)s, 3857), {CWA_SIMPLIFICATION_METERS}), 4326), "
                    f"{CWA_COORDINATE_PRECISION})"
                ),
                output_field=TextField(),
            ),
        )
        .values_list("geojson", flat=True)
        .first()
    )

    return json.loads(shape) if shape else None


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

    shape = get_cwa_shape(office.code)
    is_binary = shape is not None and len(json.dumps(shape)) > GEOMETRY_BINARY_THRESHOLD
    if is_binary:
        shape = None

    briefing = get_office_briefing(office, ZoneInfo("UTC"))
    context = {
        "office": office,
        "counties": ", ".join(counties),
        "briefing": briefing,
        "shape": shape,
        "is_binary": is_binary,
        "title_trans_args": {"wfo": wfo.upper()},
    }

    return render(
        request,
        "weather/office/overview.html",
        context,
    )
