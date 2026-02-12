from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.utils.translation import gettext_lazy as _

NOON_HOUR = 12
EVENING_HOUR = 18

utc = ZoneInfo("UTC")
one_day = timedelta(days=1)


def _get_active_duration(now, finish, tomorrow):
    if finish:
        if finish > now:
            # We are currently in the middle of the event.
            if finish < tomorrow:
                # It ends today
                return _("until {time} today").format(time=finish.strftime("%-I:%M %p"))
            # Or it ends after today.
            return _("until {time}").format(time=finish.strftime("%A %m/%d %-I:%M %p"))

        # The event has already concluded. We shouldn't be
        # showing this alert at all.
        return _("has concluded")

    # The alert has no ending or expiration time. This is a
    # weird scenario, but we should handle it just in case.
    return _("is in effect")


def set_timing(alert, tz=None):
    """Set the alert timing information for an alert dict."""
    tz = utc if not tz else tz

    onset = datetime.fromisoformat(alert["onset"]).astimezone(tz=tz)
    finish = (
        datetime.fromisoformat(alert["finish"]).astimezone(tz=tz) if "finish" in alert and alert["finish"] else None
    )

    alert["timing"] = {"start": onset, "end": finish}

    now = datetime.now(tz=tz)
    tomorrow = now + one_day
    tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
    later = tomorrow + one_day

    if onset <= now:
        # The alert has already begun. Now we need to see if we know
        # when it ends.
        alert["duration"] = _get_active_duration(now, finish, tomorrow)

    elif onset < later:
        # The event starts later today or tomorrow
        day = "this" if onset < tomorrow else "tomorrow"
        onset_hour = onset.hour
        if onset_hour < NOON_HOUR:
            alert["duration"] = _("{day} morning").format(day=day)
        elif onset_hour < EVENING_HOUR:
            alert["duration"] = _("{day} afternoon").format(day=day)
        elif onset < tomorrow:
            alert["duration"] = _("tonight")
        else:
            alert["duration"] = _("tomorrow night")
    else:
        # THe event starts in the further future
        alert["duration"] = onset.strftime("%A")

    return alert
