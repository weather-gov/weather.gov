from datetime import datetime

from backend.interop import get_briefing, get_weather_stories


def get_county_weather_stories(wfos, time_zone_info):
    """Fetch and process weather story data for a county/timezone."""
    valid = []
    errors = []
    empties = []
    for wfo in wfos:
        weather_story_data = get_weather_stories(wfo.code.upper())
        if weather_story_data and "error" not in weather_story_data:
            weather_story_data["wfo_url"] = wfo.url
            weather_story_data["wfo_name"] = wfo.name
            weather_story_data["startTime"] = datetime.fromisoformat(weather_story_data["startTime"]).astimezone(
                tz=time_zone_info
            )
            weather_story_data["updateTime"] = datetime.fromisoformat(weather_story_data["updateTime"]).astimezone(
                tz=time_zone_info
            )
            weather_story_data["endTime"] = datetime.fromisoformat(weather_story_data["endTime"]).astimezone(
                tz=time_zone_info
            )
            valid.append(weather_story_data)
        elif weather_story_data:
            # In this case, there is an error on the dict.
            # We pass this to the template as-is to handle
            # the error case
            weather_story_data["wfo_url"] = wfo.url
            weather_story_data["wfo_name"] = wfo.name
            errors.append(weather_story_data)
        else:
            # In this case, the interop function returned
            # None for the given WFO, meaning there are no
            # current weather stories there.
            # We still return a dict, but only with an officeId,
            # so that we can render the AFD links as needed.
            empties.append({"officeId": wfo.code.upper(), "wfo_url": wfo.url, "wfo_name": wfo.name, "is_empty": True})

    valid = sorted(valid, key=lambda story: story["startTime"], reverse=True)
    return valid + empties + errors


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
