from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.shortcuts import get_object_or_404, render
from django.views.decorators.cache import cache_control

from backend.util import sort_alert_key
from backend.util.state import get_wfo_data_for_state
from spatial.models import WeatherAlertsCache, WeatherCounties, WeatherStates


@cache_control(public=True, max_age=3600)
def index(request):
    """Render the state search and index page."""
    states = WeatherStates.objects.all().order_by("name")
    return render(request, "weather/state/index.html", {"states": states})


@cache_control(max_age=120, smax_age=120, public=True)
def state_alerts(request, state):
    """Render the alerts tab for a given state. This is the default view."""
    state_orm = get_object_or_404(WeatherStates, state=state.upper())

    state_fips = state_orm.fips
    subdivision_name = state_orm.get_subdivision_label(plural=False)
    subdivision_name_plural = state_orm.get_subdivision_label(plural=True)

    # Get Weather alerts for state
    alerts_queryset = WeatherAlertsCache.objects.filter(states__contains=[state_fips]).only(
        "id", "alertjson", "alertkind", "counties", "states"
    )

    # Sort Alerts by event type then `onset` time
    sorted_alerts = sorted(alerts_queryset, key=lambda alert_object: sort_alert_key(alert_object.alertjson))

    # Loop through all alerts and create set of counties
    all_fips = set()
    for alert in sorted_alerts:
        if alert.counties:
            all_fips.update(alert.counties)

    # Query all FIPS and names for each alert county
    county_map = dict(WeatherCounties.objects.filter(countyfips__in=all_fips).values_list("countyfips", "countyname"))

    # Output alerts list object
    alerts_list = []

    # Create {"FIPS": "NAME"} dictionary and attach to alert json
    for alert in sorted_alerts:
        counties_mapping = {
            fips: county_map.get(fips, fips) for fips in alert.counties if str(fips).startswith(str(state_fips))
        }

        # Alert JSON logic, remove nested geometry and set empty time list to be filled later
        aj = alert.alertjson
        aj["counties_dict"] = counties_mapping
        aj["total_counties_display"] = state_orm.get_count_display(len(counties_mapping))
        aj.pop("geometry", None)
        aj["alertDays"] = []
        alerts_list.append(aj)

    tz = ZoneInfo(state_orm.timezone or "UTC")

    now_local = datetime.now(tz)
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)

    alert_days_timeline = []

    for i in range(5):
        day_start = today_start + timedelta(days=i)
        day_end = day_start + timedelta(days=1)

        active_indices = []

        for index, alert_json in enumerate(alerts_list):
            # Parse ISO string "2026-03-30T18:14:00.000Z"
            # .replace('Z', '+00:00') handles the UTC suffix
            onset = datetime.fromisoformat(alert_json["onset"].replace("Z", "+00:00")).astimezone(tz)

            finish_str = alert_json.get("finish") or alert_json.get("ends")
            finish = None
            if finish_str:
                finish = datetime.fromisoformat(finish_str.replace("Z", "+00:00")).astimezone(tz)

            # Alert starts before the day ends
            # Alert hasn't finished yet, OR finishes after the day starts
            is_active = onset < day_end and (finish is None or finish >= day_start)

            if is_active:
                alert_json["alertDays"].append(i + 1)
                active_indices.append(index)

        alert_days_timeline.append(
            {"start": day_start, "end": day_end, "day": day_start.strftime("%A"), "alerts": active_indices}
        )

    level_priorities = {"warning": 1024, "watch": 512, "other": 0}
    levels_seen = {alert["metadata"]["level"]["text"] for alert in alerts_list}
    sorted_levels = sorted(
        list(levels_seen), key=lambda level_priority: level_priorities.get(level_priority, 0), reverse=True
    )

    legend_levels = [
        {
            "name": level,
            "css_class": f"wx_alert_map_legend--{level if level != 'other' else 'advisory'}",
            "translation_key": f"alerts.legend.{level if level != 'other' else 'advisory'}-area.01",
        }
        for level in sorted_levels
    ]

    return render(
        request,
        "weather/state/alerts.html",
        {
            "state": state_orm,
            "alerts": alerts_list,
            "alert_days_timeline": alert_days_timeline,
            "levels": legend_levels,
            "subdivision_name": subdivision_name,
            "subdivision_name_plural": subdivision_name_plural,
            "wfo_data": get_wfo_data_for_state(state_orm),
        },
    )


@cache_control(max_age=120, smax_age=120, public=True)
def state_risks(request, state):
    """Render the risks tab for a given state."""
    state = get_object_or_404(WeatherStates, state=state.upper())
    return render(request, "weather/state/risks.html", {"state": state, "wfo_data": get_wfo_data_for_state(state)})


@cache_control(max_age=120, smax_age=120, public=True)
def state_radar(request, state):
    """Render the radar tab for a given state."""
    state = get_object_or_404(WeatherStates, state=state.upper())
    return render(request, "weather/state/radar.html", {"state": state, "wfo_data": get_wfo_data_for_state(state)})


@cache_control(max_age=120, smax_age=120, public=True)
def state_analysis(request, state):
    """Render the analysis tab for a given state."""
    state = get_object_or_404(WeatherStates, state=state.upper())
    return render(request, "weather/state/analysis.html", {"state": state, "wfo_data": get_wfo_data_for_state(state)})
