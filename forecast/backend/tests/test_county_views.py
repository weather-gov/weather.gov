from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase

import spatial.models as spatial


class TestCountyViews(TestCase):
    """Tests our Django county views."""

    def setUp(self):
        """Test setup."""
        self.county1 = spatial.WeatherCounties.objects.create(
            countyname="Leatherface",
            countyfips="11111",
            st="MA",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        self.county2 = spatial.WeatherCounties.objects.create(
            # I know.
            countyname="Frankenstein",
            countyfips="22222",
            st="MA",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        self.county3 = spatial.WeatherCounties.objects.create(
            countyname="Sanderson Sisters",
            countyfips="33333",
            st="MA",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        self.county4 = spatial.WeatherCounties.objects.create(
            countyname="Anansi",
            countyfips="44444",
            st="GH",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        self.county5 = spatial.WeatherCounties.objects.create(
            countyname="Keelut",
            countyfips="55555",
            st="AK",
            shape=GEOSGeometry("POINT(0 0)"),
        )

    def test_index(self):
        """Test the index view."""
        response = self.client.get("/county/")
        self.assertTemplateUsed(response, "weather/county/index.html")
        self.assertEqual(response.context["counties"][0], self.county5)
        self.assertEqual(response.context["counties"][1], self.county4)
        self.assertEqual(response.context["counties"][2], self.county2)
        self.assertEqual(response.context["counties"][3], self.county1)
        self.assertEqual(response.context["counties"][4], self.county3)

    def test_landing(self):
        """Test the landing view."""
        response = self.client.get("/county/44444/")
        self.assertTemplateUsed(response, "weather/county/landing.html")
        self.assertEqual(response.context["county"], self.county4)

    def test_landing_404(self):
        """Test the landing view."""
        response = self.client.get("/county/99999/")
        self.assertEqual(response.status_code, 404)
