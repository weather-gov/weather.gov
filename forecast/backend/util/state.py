from backend.models.org_structure import WFO
from spatial.models import WeatherCounties


def get_wfo_data_for_state(state_instance):
    """Get WFO information for all WFOs within the state."""
    wfo_codes = [
        value[0]
        for value in
        WeatherCounties.objects.filter(state=state_instance).values_list("primarywfo__wfo")
    ]

    wfo_instances = WFO.objects.filter(code__in=wfo_codes).order_by("name")

    return [
        {
            "name": wfo.name,
            "code": wfo.code,
            "url": wfo.url,
            "phone": wfo.phone
        }
        for wfo in wfo_instances
    ]
