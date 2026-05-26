from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase
from django.urls import reverse

import spatial.models as spatial
from backend.util import disable_logging_for_quieter_tests


class TestStateViews(TestCase):
    """Tests our Django state views."""

    def setUp(self):
        """Test setup."""
        self.state_ln = spatial.WeatherStates.objects.create(
            name="Lightning", state="LN", shape=GEOSGeometry("POINT(0 0)"), county_count=0, timezone="UTC"
        )
        self.state_bn = spatial.WeatherStates.objects.create(
            name="Benjamin", state="BN", shape=GEOSGeometry("POINT(0 0)"), county_count=0, timezone="UTC"
        )
        self.state_fr = spatial.WeatherStates.objects.create(
            name="Franklin", state="FR", shape=GEOSGeometry("POINT(0 0)"), county_count=0, timezone="America/New_York"
        )
        cwa = spatial.WeatherCountyWarningAreas.objects.create(
            shape=GEOSGeometry("POINT(0 0)"),
        )
        spatial.WeatherCounties.objects.create(
            state=self.state_fr,
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
            countyfips="12345",
        )

        self.state_fr_wfo_data = [
            {"name": "Fred", "code": "FRD"},
            {"name": "Aardvark", "code": "ARD"},
            {"name": "Zebra", "code": "ZRB"},
            {"name": "Cat", "code": "FLN"},
        ]

    def test_index(self):
        """Test the index view."""
        response = self.client.get(reverse("state_index"))
        self.assertTemplateUsed(response, "weather/state/index.html")
        self.assertEqual(response.context["states"][0], self.state_bn)
        self.assertEqual(response.context["states"][1], self.state_fr)
        self.assertEqual(response.context["states"][2], self.state_ln)

    def test_overview(self):
        """Test the default page is alerts."""
        response = self.client.get(reverse("state_overview", kwargs={"state": "FR"}))
        self.assertTemplateUsed(response, "weather/state/alerts.html")
        self.assertEqual(response.context["state_abbrev"], self.state_fr.state)
        self.assertEqual(response.context["state_name"], self.state_fr.name)
        self.assertEqual(response.status_code, 200)

    def test_alerts(self):
        """Test the alerts page."""
        response = self.client.get(reverse("state_alerts", kwargs={"state": "FR"}))
        self.assertTemplateUsed(response, "weather/state/alerts.html")
        self.assertEqual(response.context["state_abbrev"], self.state_fr.state)
        self.assertEqual(response.context["state_name"], self.state_fr.name)
        self.assertEqual(response.status_code, 200)

    @mock.patch("backend.interop.get_ghwo_data_for_state")
    def test_risks(self, mock_get_ghwo_data_for_state):
        """Test the risks page."""
        mock_get_ghwo_data_for_state.return_value = {
            "composite": {
                "days": [
                    {"max": 4, "scaled": 1, "timestamp": "2026-05-06T15:00:00-05:00"},
                    {"max": 4, "scaled": 1, "timestamp": "2026-05-07T07:00:00-05:00"},
                    {"max": 1, "scaled": 0.25, "timestamp": "2026-05-08T07:00:00-05:00"},
                    {"max": 3, "scaled": 0.75, "timestamp": "2026-05-09T07:00:00-05:00"},
                    {"max": 3, "scaled": 0.75, "timestamp": "2026-05-10T07:00:00-05:00"},
                    {"max": 1, "scaled": 0.33, "timestamp": "2026-05-11T07:00:00-05:00"},
                    {"max": 1, "scaled": 0.33, "timestamp": "2026-05-12T07:00:00-05:00"},
                ],
            },
        }
        response = self.client.get(reverse("state_risks", kwargs={"state": "FR"}))
        self.assertTemplateUsed(response, "weather/state/risks.html")
        self.assertEqual(response.context["state_abbrev"], self.state_fr.state)
        self.assertEqual(response.context["state_name"], self.state_fr.name)
        self.assertEqual(response.status_code, 200)

    def test_radar(self):
        """Test the radar page."""
        response = self.client.get(reverse("state_radar", kwargs={"state": "FR"}))
        self.assertTemplateUsed(response, "weather/state/radar.html")
        self.assertEqual(response.context["state_name"], self.state_fr.name)
        self.assertEqual(response.context["state_name"], self.state_fr.name)
        self.assertEqual(response.status_code, 200)

    @mock.patch("backend.views.state.get_analysis_data_for_state")
    @mock.patch("backend.views.state.get_wfo_data_for_state")
    def test_analysis(self, mock_get_wfo_data, mock_get_analysis_data):
        """Test the analysis page."""
        mock_get_wfo_data.return_value = self.state_fr_wfo_data
        mock_get_analysis_data.return_value = {"briefings": [{"briefing": None, "officeId": "ARD"}]}
        response = self.client.get(reverse("state_analysis", kwargs={"state": "FR"}))
        self.assertTemplateUsed(response, "weather/state/analysis.html")
        self.assertEqual(response.context["state_abbrev"], self.state_fr.state)
        self.assertEqual(response.context["state_name"], self.state_fr.name)
        self.assertEqual(response.status_code, 200)

    @mock.patch("backend.views.state.get_analysis_data_for_state")
    @mock.patch("backend.views.state.get_wfo_data_for_state")
    def test_analysis_briefing_ordering(self, mock_get_wfo_data, mock_get_state_data):
        """Test analysis briefings ordering."""
        mock_get_wfo_data.return_value = self.state_fr_wfo_data
        briefings = [
            {"briefing": None, "officeId": "ARD"},
            {"briefing": {}, "officeId": "ZRB"},
            {"briefing": {}, "officeId": "FLN"},
            {"briefing": {}, "officeId": "FRD"},
        ]
        mock_get_state_data.return_value = {"briefings": briefings}
        response = self.client.get(reverse("state_analysis", kwargs={"state": "FR"}))
        self.assertEqual(
            response.context["active_briefings"],
            [
                {"briefing": {}, "officeId": "FLN", "wfo_name": "Cat"},
                {"briefing": {}, "officeId": "FRD", "wfo_name": "Fred"},
                {"briefing": {}, "officeId": "ZRB", "wfo_name": "Zebra"},
            ],
        )
        self.assertEqual(
            response.context["empty_briefings"],
            [
                {"briefing": None, "officeId": "ARD", "wfo_name": "Aardvark"},
            ],
        )

    @disable_logging_for_quieter_tests
    def test_overview_404(self):
        """Test the overview view."""
        response = self.client.get(reverse("state_overview", kwargs={"state": "TJ"}))
        self.assertEqual(response.status_code, 404)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.state.get_object_or_404")
    def test_overview_500(self, mock_get_object_or_404):
        """Test state error case."""
        mock_get_object_or_404.side_effect = Exception
        with self.assertRaises(Exception):  # noqa: PT027, B017 (we want generic Exception)
            response = self.client.get(reverse("state_overview", kwargs={"state": "FR"}))
            self.assertEqual(response.status_code, 500)
