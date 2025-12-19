import datetime
from unittest import mock, skip

from django.contrib.gis.geos import GEOSGeometry
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse

import backend.models as backend
import spatial.models as spatial
import wx_stories_api.models as wxstory


@skip("Disabled until we turn wx stories back on")
class TestCountyViewWeatherStories(TestCase):
    """Tests our Django county views with weather stories."""

    def setUp(self):
        """Test setup."""
        region = backend.Region.objects.create(name="Regional Area")
        wfo1 = backend.WFO.objects.create(
            name="Yondertown",
            code="YND",
            region=region,
        )

        wfo2 = backend.WFO.objects.create(
            name="Overthereville",
            code="OTV",
            region=region,
        )

        wfo3 = backend.WFO.objects.create(
            name="Thencefordshire",
            code="TFS",
            region=region,
        )

        self.story1 = wxstory.WeatherStory.objects.create(
            title="Yondertown is gonna get snow!",
            description="Dozens and dozens of individual snows are expected.",
            wfo=wfo1,
            image=SimpleUploadedFile("story.png", b""),
            # Set the start and end times in the past and future, respectively.
            # We're mostly going to be testing that the stories show up and
            # that they are sorted correctly, so we need to know the start
            # order. We also need them to end in the future, otherwise they
            # will be filtered out in the query.
            #
            # 1991 is the year of the great Minnesota Halloween Blizzard. =
            starttime=datetime.datetime.now(tz=datetime.timezone.utc).replace(year=1991),
            endtime=datetime.datetime.now(tz=datetime.timezone.utc).replace(
                year=datetime.datetime.now(tz=datetime.timezone.utc).year + 1,
            ),
        )

        self.story2 = wxstory.WeatherStory.objects.create(
            title="It's gonna rain",
            description="Little bitty stingin' rain, and big ol' fat rain. Rain "
            + "that flew in sideways. And sometimes rain will even seem to come "
            + "straight up from underneath. Shoot, it'll even rain at night.",
            wfo=wfo2,
            image=SimpleUploadedFile("story.png", b""),
            # Forrest Gump is in Vietnam in 1967.
            starttime=datetime.datetime.now(tz=datetime.timezone.utc).replace(year=1967),
            endtime=datetime.datetime.now(tz=datetime.timezone.utc).replace(
                year=datetime.datetime.now(tz=datetime.timezone.utc).year + 1,
            ),
        )

        self.story3 = wxstory.WeatherStory.objects.create(
            title="Severe weather with tornados possible",
            description="You're going to need your best little red truck. Beware of cows.",
            wfo=wfo3,
            image=SimpleUploadedFile("story.png", b""),
            # The movie Twister comes out in 1996.
            starttime=datetime.datetime.now(tz=datetime.timezone.utc).replace(year=1996),
            endtime=datetime.datetime.now(tz=datetime.timezone.utc).replace(
                year=datetime.datetime.now(tz=datetime.timezone.utc).year + 1,
            ),
        )

        cwa1 = spatial.WeatherCountyWarningAreas.objects.create(
            wfo="YND",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        cwa2 = spatial.WeatherCountyWarningAreas.objects.create(
            wfo="OTV",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        cwa3 = spatial.WeatherCountyWarningAreas.objects.create(
            wfo="TFS",
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
        self.county2.cwas.set([cwa1, cwa2, cwa3])

        self.ghwo = {"days": [], "fips": "12345"}

    def tearDown(self):
        """Cleanup by deleting these temporary files."""
        self.story1.image.delete(save=False)
        self.story2.image.delete(save=False)
        self.story3.image.delete(save=False)
        return super().tearDown()

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_one_weather_story(self, mock_get_radar, mock_get_county_data):
        """Test the overview view with just one weather story."""
        mock_get_county_data.return_value = {"riskOverview": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "11111"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"]["weather_stories"],
            [self.story1],
        )

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_multiple_weather_stories(self, mock_get_radar, mock_get_county_data):
        """Test the weather stories are properly sorted if there are multiple."""
        mock_get_county_data.return_value = {"riskOverview": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "22222"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"]["weather_stories"],
            [self.story3, self.story1, self.story2],
        )
