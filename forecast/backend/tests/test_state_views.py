from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase

import spatial.models as spatial


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
        )

    def test_index(self):
        """Test the index view."""
        response = self.client.get("/state/")
        self.assertTemplateUsed(response, "weather/state/index.html")
        self.assertEqual(response.context["states"][0], self.state_bn)
        self.assertEqual(response.context["states"][1], self.state_fr)
        self.assertEqual(response.context["states"][2], self.state_ln)

    def test_landing(self):
        """Test the landing view."""
        response = self.client.get("/state/FR/")
        self.assertTemplateUsed(response, "weather/state/landing.html")
        self.assertEqual(response.context["state"], self.state_fr)
        self.assertEqual(response.status_code, 200)

    def test_landing_404(self):
        """Test the landing view."""
        response = self.client.get("/state/TJ/")
        self.assertEqual(response.status_code, 404)
