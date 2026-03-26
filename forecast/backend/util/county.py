from datetime import datetime


def risk_overview_timestamps_to_dates(risk_overview, tz):
    """Given a risk overview and timezone, replace timestamp strings with datetime objects."""
    # Fixup risk overview timestamps to local
    if risk_overview:
        # Verify that the key exists and is non-empty
        if risk_overview.get("days", False):
            for day in risk_overview["days"]:
                day["timestamp"] = datetime.fromisoformat(day["timestamp"]).astimezone(tz=tz)
        if risk_overview.get("composite", False):
            if risk_overview["composite"].get("days", False):
                for day in risk_overview["composite"]["days"]:
                    day["timestamp"] = datetime.fromisoformat(day["timestamp"]).astimezone(tz=tz)


