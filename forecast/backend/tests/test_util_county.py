from datetime import datetime
from zoneinfo import ZoneInfo

from django.test import TestCase

from backend.util import county


class TestCountyUtil(TestCase):
    """Tests the utilities for counties."""

    def test_risk_overview_timestamps_to_dates(self):
        """Tests converting timestamp strings to dates."""
        tz = ZoneInfo("America/Chicago")

        risk_overview = {
            "days": [
                {"timestamp": "1990-01-01T12:00:00Z"},
                {"timestamp": "1992-04-12T16:30:00-04:00"},
                {"timestamp": "1994-07-31T05:00:00+03:00"},
            ],
            "composite": {
                "days": [
                    {"timestamp": "1996-02-02T02:02:02Z"},
                ],
            },
        }

        expected = {
            "days": [
                {"timestamp": datetime.fromisoformat("1990-01-01T12:00:00Z").astimezone(tz=tz)},
                {"timestamp": datetime.fromisoformat("1992-04-12T16:30:00-04:00").astimezone(tz=tz)},
                {"timestamp": datetime.fromisoformat("1994-07-31T05:00:00+03:00").astimezone(tz=tz)},
            ],
            "composite": {
                "days": [
                    {"timestamp": datetime.fromisoformat("1996-02-02T02:02:02Z").astimezone(tz=tz)},
                ],
            },
        }

        county.risk_overview_timestamps_to_dates(risk_overview, tz)

        # The object is updated in-place
        self.assertEqual(risk_overview, expected)
