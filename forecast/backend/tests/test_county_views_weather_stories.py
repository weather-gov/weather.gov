from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase
from django.urls import reverse

import backend.models as backend
import spatial.models as spatial


class TestCountyViewWeatherStories(TestCase):
    """Tests our Django county views with weather stories."""

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

        self.basic_story = [
            {
                "id": "7ccab810-706b-401c-8757-71f656e56270",
                "officeId": "YND",
                "startTime": "2026-01-01T12:00:00+00:00",
                "endTime": "2027-01-01T12:00:00+00:00",
                "updateTime": "2026-01-10T12:00:00+00:00",
                "title": "Testing the test",
                "description": "This is a triumph. I'm making a note here: huge success",
                "altText": "Alternative to text? Pictures!",
                "priority": False,
                "order": 1,
                "download": "/public/images/wfos/YND.png",
            }
        ]

        self.multiple_stories = [
            {
                "id": "7ccab810-706b-401c-8757-71f656e56270",
                "officeId": "YND",
                "startTime": "2026-01-01T12:00:00+00:00",
                "endTime": "2027-01-01T12:00:00+00:00",
                "updateTime": "2026-01-10T12:00:00+00:00",
                "title": "Testing the test",
                "description": "This is a triumph. I'm making a note here: huge success",
                "altText": "Alternative to text? Pictures!",
                "priority": False,
                "order": 1,
                "download": "/public/images/wfos/YND.png",
            },
            {
                "id": "7ccab810-706b-401c-8757-71f656e56271",
                "officeId": "OTV",
                "startTime": "2026-01-01T12:00:00+00:00",
                "endTime": "2027-01-01T12:00:00+00:00",
                "updateTime": "2026-01-10T12:00:00+00:00",
                "title": "Testing the test",
                "description": "This is another weather story!",
                "altText": "Alternative to text? Pictures!",
                "priority": False,
                "order": 1,
                "download": "/public/images/wfos/OTV.png",
            },
        ]

        self.ghwo = {"days": [], "fips": "12345"}

    @mock.patch("backend.views.county.get_county_weather_stories")
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_one_weather_story(self, mock_get_radar, mock_get_county_data, mock_get_weather_stories):
        """Test the overview view with just one weather story."""
        mock_get_county_data.return_value = {"riskOverview": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}
        mock_get_weather_stories.return_value = self.basic_story

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["weather_stories"],
            self.basic_story,
        )

    @mock.patch("backend.views.county.get_county_weather_stories")
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_multiple_weather_stories(
        self, mock_get_radar, mock_get_county_data, mock_get_weather_stories
    ):
        """Test the weather stories are properly sorted if there are multiple."""
        mock_get_county_data.return_value = {"riskOverview": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}
        mock_get_weather_stories.return_value = self.multiple_stories

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "22222"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["weather_stories"],
            self.multiple_stories,
        )

    @mock.patch("backend.views.county.get_county_weather_stories")
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_empty_weather_stories(self, mock_get_radar, mock_get_county_data, mock_get_weather_stories):
        """Test the weather stories is an empty list if data is empty."""
        mock_get_county_data.return_value = {"riskOverview": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}
        mock_get_weather_stories.return_value = []

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "22222"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["weather_stories"],
            [],
        )

    @mock.patch("backend.util.nwsconnect.get_weather_stories")
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_error_in_weather_story(self, mock_get_radar, mock_get_county_data, mock_get_weather_stories):
        """Test that error objects propagate from fetching bad weather stories."""
        mock_get_county_data.return_value = {"riskOverview": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}
        mock_get_weather_stories.return_value = {"error": "this", "officeId": "YND"}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
        self.assertEqual(
            response.context["data"]["weather_stories"],
            [{"error": "this", "officeId": "YND", "wfo_url": "/offices/YND/", "wfo_name": "Yondertown"}],
        )

    @mock.patch("backend.interop._fetch")
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_story_fetch_error_still_renders(self, mock_get_radar, mock_get_county_data, mock_fetch):
        """Test that a fetch error for stories still renders a valid template."""
        mock_get_county_data.return_value = {"riskOverview": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}
        mock_fetch.side_effect = Exception("Test exception!")

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertTemplateUsed(response, "weather/partials/county-weather-stories.html")
