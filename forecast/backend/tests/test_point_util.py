from datetime import datetime
from zoneinfo import ZoneInfo

from django.test import TestCase

from backend.util.point import render_as_htmx


class TestPointUtilities(TestCase):
    """Tests our point view utilities."""

    def test_localized_timestamp_in_htmx_render(self):
        """Ensures we are rendering the correct timezone."""
        raw_timestamp = "2024-09-01T00:00:00-00:00"
        tz = ZoneInfo("America/New_York")
        timestamp = datetime.fromisoformat(raw_timestamp).astimezone(tz=tz)

        expected = "Saturday, 8:00 PM EDT\n"
        actual = render_as_htmx(
            "weather/test/point-util-timestamp.html",
            { "timestamp": timestamp },
            tz,
        )

        self.assertEqual(expected, actual)
