from datetime import datetime

from backend.interop import get_briefing


def get_office_briefing(wfo, time_zone_info):
    """Fetch the current briefing, if any, for an office."""
    briefing = get_briefing(wfo.code.upper())
    if briefing:
        briefing["wfo_url"] = wfo.url
        briefing["wfo_name"] = wfo.name
        if "error" not in briefing:
            briefing["startTime"] = datetime.fromisoformat(briefing["startTime"]).astimezone(tz=time_zone_info)
            briefing["endTime"] = datetime.fromisoformat(briefing["endTime"]).astimezone(tz=time_zone_info)
            briefing["updateTime"] = datetime.fromisoformat(briefing["updateTime"]).astimezone(tz=time_zone_info)

            # If the briefing was updated prior to its start time, we don't
            # care about that update. However, if it was updated after the
            # briefing went live, then we absolutely do care.
            briefing["updateTime"] = max(briefing["updateTime"], briefing["startTime"])
    return briefing


def get_county_briefings(wfos, time_zone_info):
    """Fetch briefings for a set of WFOs."""
    valid = []
    errors = []
    empties = []
    for wfo in wfos:
        briefing = get_office_briefing(wfo, time_zone_info)
        if briefing:
            if "error" in briefing:
                errors.append(briefing)
            else:
                valid.append(briefing)
        else:
            empties.append({"officeId": wfo.code.upper(), "wfo_url": wfo.url, "wfo_name": wfo.name, "is_empty": True})

    return valid + empties + errors
