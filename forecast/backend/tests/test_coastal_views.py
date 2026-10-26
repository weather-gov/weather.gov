
from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase
from django.urls import reverse

import spatial.models as spatial


class TestStateViews(TestCase):
    """Tests our Django state views."""

    def setUp(self):
        """Test setup."""
        self.zone_ar = spatial.WeatherZone.objects.create(
            id="https://api.weather.gov/zones/forecast/AMZ999",
            state=None,
            shape=GEOSGeometry("POLYGON((3 7, 7 7, 7 3, 3 3, 3 7))"),
            type="marine:coastal",
            wfo="MHX",
            name="Alligator River Test"
        )
        self.zone_ar = spatial.WeatherZone.objects.create(
            id="https://api.weather.gov/zones/forecast/AKZ999",
            state="AK",
            shape=GEOSGeometry("POLYGON((3 7, 7 7, 7 3, 3 3, 3 7))"),
            type="public",
            wfo="AFC",
            name="Lake Iliamna / Nila Vena / Nanvarpak Test"
        )

    def test_index(self):
        """Test the index view."""
        response = self.client.get(reverse("coastal_index"))
        self.assertTemplateUsed(response, "weather/coastal/index.html")


    def test_alerts(self):
        """Test the alerts page."""
        response = self.client.get(
            reverse("coastal_alerts", kwargs={"zone_id": "AMZ999"}))
        self.assertTemplateUsed(response, "weather/coastal/alerts.html")
        self.assertEqual(response.context["zone_id"], "AMZ999")
        self.assertEqual(response.status_code, 200)

    def test_forecast(self):
        """Test the forecast page."""
        response = self.client.get(
            reverse("coastal_forecast", kwargs={"zone_id": "AMZ999"}))
        self.assertTemplateUsed(response, "weather/coastal/forecast.html")
        self.assertEqual(response.context["zone_id"], "AMZ999")
        self.assertEqual(response.status_code, 200)

    def test_conditions(self):
        """Test the conditions page."""
        response = self.client.get(
            reverse("coastal_conditions", kwargs={"zone_id": "AMZ999"}))
        self.assertTemplateUsed(response, "weather/coastal/conditions.html")
        self.assertEqual(response.context["zone_id"], "AMZ999")
        self.assertEqual(response.status_code, 200)

    def test_alerts_non_marine(self):
            """Test the alerts page 404 for non marine zone."""
            response = self.client.get(
                reverse("coastal_alerts", kwargs={"zone_id": "AKZ999"}))
            self.assertEqual(response.status_code, 404)
