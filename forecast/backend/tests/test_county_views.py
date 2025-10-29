import datetime
from functools import partial
from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

import backend.models as backend
import spatial.models as spatial
import wx_stories_api.models as wxstory


class TestCountyViews(TestCase):
    """Tests our Django county views."""

    def setUp(self):
        """Test setup."""
        region = backend.Region.objects.create(name="Regional Area")
        self.wfo = backend.WFO.objects.create(
            name="Yondertown",
            code="YND",
            region=region,
        )

        self.briefing = wxstory.SituationReport.objects.create(
            title="County briefing",
            description="Some briefing briefs",
            pdf=SimpleUploadedFile("sit_rep.pdf", b"File contents here."),
            wfo=self.wfo,
        )
        # The first, and so far only, British satellite to be launched on a
        # British rocket, Prospero, lifts off.
        self.briefing.created_at = datetime.datetime(1971, 10, 28, 0, 0, 0, tzinfo=datetime.timezone.utc)

        # The Alaska Highway is completed, for the first time connecting Alaska
        # to the continental United States by way of a road and a rail line.
        # It was over 1,700 miles long, but it has been straightened since then
        # and is now less than 1,400 miles long. And it's paved!
        updated_at = datetime.datetime(1948, 10, 28, 14, 30, 0, tzinfo=datetime.timezone.utc)
        # Gotta use a mock here because the model definition automatically
        # sets the updated_at field to the current time whenever it gets saved.
        with mock.patch("django.utils.timezone.now", mock.Mock(return_value=updated_at)):
            self.briefing.save()

        # Delete the test file when we're finished so it doesn't just hang
        # around forever.
        self.addCleanup(partial(self.briefing.pdf.delete, save=False))

        cwa = spatial.WeatherCountyWarningAreas.objects.create(
            wfo="YND",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        cwa_with_no_wfo = spatial.WeatherCountyWarningAreas.objects.create(wfo="NOP", shape=GEOSGeometry("POINT(0 0)"))

        self.county1 = spatial.WeatherCounties.objects.create(
            countyname="Leatherface",
            countyfips="11111",
            st="MA",
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county2 = spatial.WeatherCounties.objects.create(
            # I know.
            countyname="Frankenstein",
            countyfips="22222",
            st="MA",
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county3 = spatial.WeatherCounties.objects.create(
            countyname="Sanderson Sisters",
            countyfips="33333",
            st="MA",
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county3.cwas.set([cwa_with_no_wfo])
        self.county4 = spatial.WeatherCounties.objects.create(
            countyname="Anansi",
            countyfips="44444",
            st="GH",
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county4.cwas.set([cwa])
        self.county5 = spatial.WeatherCounties.objects.create(
            countyname="Keelut",
            countyfips="55555",
            st="AK",
            shape=GEOSGeometry("POINT(0 0)"),
            timezone="America/Anchorage",
            primarywfo=cwa,
        )
        self.county5.cwas.set([cwa])

        self.ghwo = {"days": [], "fips": "12345"}

    def test_index(self):
        """Test the index view."""
        response = self.client.get("/county/")
        self.assertTemplateUsed(response, "weather/county/index.html")
        self.assertEqual(response.context["counties"][0], self.county5)
        self.assertEqual(response.context["counties"][1], self.county4)
        self.assertEqual(response.context["counties"][2], self.county2)
        self.assertEqual(response.context["counties"][3], self.county1)
        self.assertEqual(response.context["counties"][4], self.county3)

    @mock.patch("backend.interop.get_county_data")
    def test_landing_without_timezone(self, mock_get_county_data):
        """Test the landing view without timezone."""
        mock_get_county_data.return_value = {"hazardOutlook": self.ghwo}

        response = self.client.get("/county/44444/")
        self.assertTemplateUsed(response, "weather/county/landing.html")
        self.assertEqual(
            response.context["data"],
            {
                "public": {"hazardOutlook": self.ghwo},
                "briefings": [
                    {
                        "wfo": self.wfo,
                        "report": self.briefing,
                        "created": {
                            "human": "Thursday, Oct 28 1971, 12:00 AM UTC",
                            "timestamp": "1971-10-28T00:00:00+00:00",
                        },
                        # There is no updated property because the creation
                        # time is less than 1 second before the updated time, so
                        # we are assuming the time difference is just due to
                        # processing time in the SQL query.
                    },
                ],
            },
        )

    @mock.patch("backend.interop.get_county_data")
    def test_landing_with_timezone(self, mock_get_county_data):
        """Test the landing view with timezone."""
        mock_get_county_data.return_value = {"hazardOutlook": self.ghwo}

        # Matt Smith, the Eleventh Doctor Who, is born. We change the updated_at
        # here to ensure that when it is after the creation date, we get the
        # updated_at property set correctly.
        updated_at = datetime.datetime(1982, 10, 28, 14, 30, 0, tzinfo=datetime.timezone.utc)
        # Gotta use a mock here because the model definition automatically
        # sets the updated_at field to the current time whenever it gets saved.
        with mock.patch("django.utils.timezone.now", mock.Mock(return_value=updated_at)):
            self.briefing.save()

        response = self.client.get("/county/55555/")
        self.assertTemplateUsed(response, "weather/county/landing.html")
        self.assertEqual(
            response.context["data"],
            {
                "public": {"hazardOutlook": self.ghwo},
                "briefings": [
                    {
                        "wfo": self.wfo,
                        "report": self.briefing,
                        "created": {
                            "human": "Wednesday, Oct 27 1971, 3:00 PM AHDT",
                            "timestamp": "1971-10-27T15:00:00-09:00",
                        },
                        "updated": {
                            "human": "Thursday, Oct 28 1982, 5:30 AM AHDT",
                            "timestamp": "1982-10-28T05:30:00-09:00",
                        },
                    },
                ],
            },
        )

    @mock.patch("backend.interop.get_county_data")
    def test_landing_with_no_wfo(self, mock_get_county_data):
        """Test the landing view where the county doesn't map to a WFO.

        This is an error condition, but we don't want it to crash the UX.
        """
        mock_get_county_data.return_value = {"hazardOutlook": self.ghwo}

        response = self.client.get("/county/33333/")
        self.assertTemplateUsed(response, "weather/county/landing.html")
        self.assertEqual(
            response.context["data"],
            {"public": {"hazardOutlook": self.ghwo}, "briefings": []},
        )

    def test_landing_404(self):
        """Test the landing view."""
        response = self.client.get("/county/99999/")
        self.assertEqual(response.status_code, 404)
