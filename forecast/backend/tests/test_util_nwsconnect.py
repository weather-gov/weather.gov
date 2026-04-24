from datetime import datetime
from unittest import mock
from zoneinfo import ZoneInfo

from django.test import TestCase

from backend.models import WFO, Region
from backend.util import nwsconnect


class TestNWSConnectUtil(TestCase):
    """Tests the NWS Connect utilities."""

    @classmethod
    def setUpTestData(cls):
        """Set up tests."""
        cls.wfo1 = WFO.objects.create(code="NWC", name="Test WFO", region=Region.objects.create(name="Regional region"))
        cls.wfo2 = WFO.objects.create(code="NWX", name="Test WFO", region=Region.objects.create(name="Regional region"))

    @mock.patch("backend.util.nwsconnect.get_briefing")
    def test_get_office_briefing_success(self, mock_get_briefing):
        """Tests the happy path for a single office briefing."""
        mock_get_briefing.return_value = {
            "title": "Test briefing",
            "startTime": "1990-01-01T00:00:00Z",
            "endTime": "1991-01-01T00:00:00Z",
            "updateTime": "1990-01-01T00:00:00Z",
        }

        tz = ZoneInfo("UTC")

        expected = {
            "title": "Test briefing",
            "startTime": datetime.fromisoformat("1990-01-01T00:00:00Z").astimezone(tz=tz),
            "endTime": datetime.fromisoformat("1991-01-01T00:00:00Z").astimezone(tz=tz),
            "updateTime": datetime.fromisoformat("1990-01-01T00:00:00Z").astimezone(tz=tz),
            "wfo_name": "Test WFO",
            "wfo_url": "/offices/NWC/",
        }

        actual = nwsconnect.get_office_briefing(self.wfo1, tz)

        self.assertEqual(actual, expected)

    @mock.patch("backend.util.nwsconnect.get_briefing")
    def test_get_office_briefing_no_briefing(self, mock_get_briefing):
        """Tests when there is no briefing for a single office briefing."""
        mock_get_briefing.return_value = None

        tz = ZoneInfo("UTC")

        expected = None

        actual = nwsconnect.get_office_briefing(self.wfo1, tz)

        self.assertEqual(actual, expected)

    @mock.patch("backend.util.nwsconnect.get_briefing")
    def test_get_office_briefing_error(self, mock_get_briefing):
        """Tests an error for a single office briefing."""
        mock_get_briefing.return_value = {"error": True}

        tz = ZoneInfo("UTC")

        expected = {
            "error": True,
            "wfo_name": "Test WFO",
            "wfo_url": "/offices/NWC/",
        }

        actual = nwsconnect.get_office_briefing(self.wfo1, tz)

        self.assertEqual(actual, expected)
