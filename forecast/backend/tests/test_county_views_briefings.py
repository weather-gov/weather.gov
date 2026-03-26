from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase
from django.urls import reverse

import backend.models as backend
import spatial.models as spatial


class TestCountyViewBriefings(TestCase):
    """Tests our Django county views with briefings."""

    def setUp(self):
        """Test setup."""
        region = backend.Region.objects.create(name="Regional Area")
        backend.WFO.objects.create(
            name="Yondertown",
            code="YND",
            region=region,
        )

        backend.WFO.objects.create(
            name="Overthereville",
            code="OTV",
            region=region,
        )

        cwa1 = spatial.WeatherCountyWarningAreas.objects.create(
            wfo="YND",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        cwa2 = spatial.WeatherCountyWarningAreas.objects.create(
            wfo="OTV",
            shape=GEOSGeometry("POINT(0 0)"),
        )

        self.county1 = spatial.WeatherCounties.objects.create(
            countyname="County",
            countyfips="11111",
            st="MA",
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa1,
        )
        self.county1.cwas.set([cwa1])

        self.county2 = spatial.WeatherCounties.objects.create(
            countyname="Parish",
            countyfips="22222",
            st="MA",
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa1,
        )
        self.county2.cwas.set([cwa1, cwa2])

        self.basic_briefing = [
            {
                "briefing": {
                    "id": "7ccab810-706b-401c-8757-71f656e56270",
                    "startTime": "2026-01-01T12:00:00+00:00",
                    "endTime": "2027-01-01T12:00:00+00:00",
                    "updateTime": "2026-01-10T12:00:00+00:00",
                    "title": "A short tab title",
                    "description": "A longer description of the briefing packet contents.",
                    "priority": False,
                    "officeId": "YND",
                    "download": "http://localhost:8000/offices/MPX/briefing/download/7ccab810-706b-401c-8757-71f656e56270"
                },
                "officeId": "YND"
            }
        ]

        self.multiple_briefings = [
            {
                "briefing": {
                    "id": "7ccab810-706b-401c-8757-71f656e56270",
                    "startTime": "2026-01-01T12:00:00+00:00",
                    "endTime": "2027-01-01T12:00:00+00:00",
                    "updateTime": "2026-01-10T12:00:00+00:00",
                    "title": "A short tab title",
                    "description": "A longer description of the briefing packet contents.",
                    "priority": False,
                    "officeId": "YND",
                    "download": "http://localhost:8000/offices/MPX/briefing/download/7ccab810-706b-401c-8757-71f656e56270"
                },
                "officeId": "YND"
            },
            {
                "briefing": {
                    "id": "7ccab810-706b-401c-8757-71f656e56271",
                    "startTime": "2026-01-01T12:00:00+00:00",
                    "endTime": "2027-01-01T12:00:00+00:00",
                    "updateTime": "2026-01-10T12:00:00+00:00",
                    "title": "A short tab title",
                    "description": "A longer description of the briefing packet contents.",
                    "priority": False,
                    "officeId": "OTV",
                    "download": "http://localhost:8000/offices/MPX/briefing/download/7ccab810-706b-401c-8757-71f656e56270"
                },
                "officeId": "OTV"
            },
        ]

        self.errored_briefing = [
            { "error": True, "officeId": "YND" }
        ]

        self.ghwo = {"days": [], "fips": "12345"}


    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_one_briefing(self, mock_get_radar, mock_get_county_data):
        """Test the overview view with just one briefing."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {
                "wfos": ["YND"]
            },
            "weatherstories": [],
            "briefings": self.basic_briefing,
        }
        mock_get_radar.return_value = { "radarMetadata": {}}

        expected = [briefing["briefing"] for briefing in self.basic_briefing]

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["briefings"],
            expected
        )

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_multiple_briefings(self, mock_get_radar, mock_get_county_data):
        """Test the overview with multiple briefings."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {
                "wfos": ["YND", "OTV"]
            },
            "weatherstories": [],
            "briefings": [briefing["briefing"] for briefing in self.multiple_briefings],
        }
        mock_get_radar.return_value = { "radarMetadata": {}}

        expected = [briefing["briefing"] for briefing in self.multiple_briefings]

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["briefings"],
            expected
        )

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_empty_briefings_list(self, mock_get_radar, mock_get_county_data):
        """Test the overview with empty briefings."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {
                "wfos": ["YND", "OTV"]
            },
            "weatherstories": [],
            "briefings": [],
        }
        mock_get_radar.return_value = { "radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["briefings"],
            [],
        )

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_null_briefing(self, mock_get_radar, mock_get_county_data):
        """
        Test the overview with briefing data that has a null response.

        This is a different kind of empty response, where the inner dict has a
        'briefing' key whose value is null
        """
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {
                "wfos": ["YND", "OTV"]
            },
            "weatherstories": [],
            "briefings": [
                {"briefing": None }
            ],
        }
        mock_get_radar.return_value = { "radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["briefings"],
            [],
        )

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_error_in_briefings(self, mock_get_radar, mock_get_county_data):
        """Test the overview with an error in the briefings."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {
                "wfos": ["YND", "OTV"]
            },
            "weatherstories": [],
            "briefings": self.errored_briefing,
        }
        mock_get_radar.return_value = { "radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["briefings"],
            self.errored_briefing,
        )
