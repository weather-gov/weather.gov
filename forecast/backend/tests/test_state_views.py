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
            name="Lightning",
            state="LN",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        self.state_bn = spatial.WeatherStates.objects.create(
            name="Benjamin",
            state="BN",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        self.state_fr = spatial.WeatherStates.objects.create(
            name="Franklin",
            state="FR",
            shape=GEOSGeometry("POINT(0 0)"),
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

    def test_index(self):
        """Test the index view."""
        response = self.client.get(reverse("state_index"))
        self.assertTemplateUsed(response, "weather/state/index.html")
        self.assertEqual(response.context["states"][0], self.state_bn)
        self.assertEqual(response.context["states"][1], self.state_fr)
        self.assertEqual(response.context["states"][2], self.state_ln)

    def test_overview(self):
        """Test the overview view."""
        response = self.client.get(reverse("state_overview", kwargs={"state": "FR"}))
        self.assertTemplateUsed(response, "weather/state/overview.html")
        self.assertEqual(response.context["state"], self.state_fr)
        self.assertEqual(response.status_code, 200)

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
