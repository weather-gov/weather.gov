import datetime
from functools import partial
from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse

import backend.models as backend
import spatial.models as spatial
import wx_stories_api.models as wxstory
from backend.util import disable_logging_for_quieter_tests


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

        self.state1 = spatial.WeatherStates.objects.create(
            state="AK",
            name="Alaska",
            fips=90,
            shape=GEOSGeometry("POINT(0 0)"),
        )

        self.state2 = spatial.WeatherStates.objects.create(
            state="MA",
            name="Mass",
            fips=90,
            shape=GEOSGeometry("POINT(0 0)"),
        )

        self.state3 = spatial.WeatherStates.objects.create(
            state="GH",
            name="Ghert",
            fips=92,
            shape=GEOSGeometry("POINT(0 0)"),
        )

        self.county1 = spatial.WeatherCounties.objects.create(
            countyname="Leatherface",
            countyfips="11111",
            st="MA",
            state=self.state2,
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county2 = spatial.WeatherCounties.objects.create(
            # I know.
            countyname="Frankenstein",
            countyfips="22222",
            st="MA",
            state=self.state2,
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county3 = spatial.WeatherCounties.objects.create(
            countyname="Sanderson Sisters",
            countyfips="33333",
            st="MA",
            state=self.state2,
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county3.cwas.set([cwa_with_no_wfo])
        self.county4 = spatial.WeatherCounties.objects.create(
            countyname="Anansi",
            countyfips="44444",
            st="GH",
            state=self.state3,
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county4.cwas.set([cwa])
        self.county5 = spatial.WeatherCounties.objects.create(
            countyname="Keelut",
            countyfips="55555",
            st="AK",
            state=self.state1,
            shape=GEOSGeometry("POINT(0 0)"),
            timezone="America/Anchorage",
            primarywfo=cwa,
        )
        self.county5.cwas.set([cwa])

        self.ghwo = {"days": [], "fips": "12345"}

    def test_index(self):
        """Test the index view."""
        response = self.client.get(reverse("county_index"))
        self.assertTemplateUsed(response, "weather/county/index.html")

        self.assertIn(
            self.state1,
            response.context["states"],
        )
        self.assertIn(
            { "value": self.state1.state, "text": self.state1.name },
            response.context["state_list_items"],
        )
        self.assertIn(
            self.state2,
            response.context["states"],
        )
        self.assertIn(
            { "value": self.state2.state, "text": self.state2.name },
            response.context["state_list_items"],
        )
        self.assertIn(
            self.state3,
            response.context["states"],
        )
        self.assertIn(
            { "value": self.state3.state, "text": self.state3.name },
            response.context["state_list_items"],
        )

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_link_to_county_ghwo(self, mock_get_radar, mock_get_county_data):
        """Test that county overview links to detailed risk analysis."""
        mock_get_county_data.return_value = {"hazardOutlook": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        link = reverse("county_ghwo", kwargs={"county_fips": "44444"})
        self.assertContains(response, link)

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_without_timezone(self, mock_get_radar, mock_get_county_data):
        """Test the overview view without timezone."""
        mock_get_county_data.return_value = {"hazardOutlook": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"],
            {
                "alert_levels": [],
                "alert_level_days": [],
                "county_label": "Anansi County, GH",
                "primary_wfo": self.wfo,
                "public": {"hazardOutlook": self.ghwo, "alerts": {"items": []}, "alertDays": []},
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
                "weather_stories": [],
                "radar": {"radarMetadata": {}},
            },
        )

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_timezone(self, mock_get_radar, mock_get_county_data):
        """Test the overview view with timezone."""
        mock_get_county_data.return_value = {"hazardOutlook": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}

        # Matt Smith, the Eleventh Doctor Who, is born. We change the updated_at
        # here to ensure that when it is after the creation date, we get the
        # updated_at property set correctly.
        updated_at = datetime.datetime(1982, 10, 28, 14, 30, 0, tzinfo=datetime.timezone.utc)
        # Gotta use a mock here because the model definition automatically
        # sets the updated_at field to the current time whenever it gets saved.
        with mock.patch("django.utils.timezone.now", mock.Mock(return_value=updated_at)):
            self.briefing.save()

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "55555"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"],
            {
                "alert_levels": [],
                "alert_level_days": [],
                "county_label": "Keelut Census Area, AK",
                "primary_wfo": self.wfo,
                "public": {"hazardOutlook": self.ghwo, "alerts": {"items": []}, "alertDays": []},
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
                "weather_stories": [],
                "radar": {"radarMetadata": {}},
            },
        )

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_no_wfo(self, mock_get_radar, mock_get_county_data):
        """Test the overview view where the county doesn't map to a WFO.

        This is an error condition, but we don't want it to crash the UX.
        """
        mock_get_county_data.return_value = {"hazardOutlook": self.ghwo, "alerts": {"items": []}, "alertDays": []}
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "33333"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"],
            {
                "alert_level_days": [],
                "alert_levels": [],
                "county_label": "Sanderson Sisters County, MA",
                "public": {
                    "alerts": {"items": []},
                    "alertDays": [],
                    "hazardOutlook": self.ghwo,
                },
                "briefings": [],
                "weather_stories": [],
                "radar": {"radarMetadata": {}},
                "primary_wfo": None,
            },
        )

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_alert_level_to_day_mapping(self, mock_get_radar, mock_get_county_data):
        """Tests that the levels for alerts on given days are mapped correctly."""
        mock_get_county_data.return_value = {
            "hazardOutlook": self.ghwo,
            "alerts": {
                "items": [
                    {"metadata": {"level": {"text": "warning"}}},
                    {"metadata": {"level": {"text": "other"}}},
                    {"metadata": {"level": {"text": "watch"}}},
                    {"metadata": {"level": {"text": "watch"}}},
                ],
            },
            "alertDays": [
                {"day": "Oneday", "alerts": [2, 1]},  # watch, other
                {"day": "Today", "alerts": [1, 0]},  # other, warning
                {"day": "3sday", "alerts": [0, 3]},  # warning, watch
            ],
        }
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "33333"}))

        alert_levels = response.context["data"]["alert_levels"]
        alert_level_days = response.context["data"]["alert_level_days"]

        # Make sure they are in the correct order.
        self.assertEqual(
            alert_levels,
            [
                {
                    "name": "warning",
                    "css_class": "wx_alert_map_legend--warning",
                    "translation_key": "alerts.legend.warning-area.01",
                },
                {
                    "name": "watch",
                    "css_class": "wx_alert_map_legend--watch",
                    "translation_key": "alerts.legend.watch-area.01",
                },
                {
                    "name": "other",
                    "css_class": "wx_alert_map_legend--advisory",
                    "translation_key": "alerts.legend.advisory-area.01",
                },
            ],
        )

        # And also for each day
        self.assertEqual(alert_level_days, ["watch other", "warning other", "warning watch"])

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_alert_levels_only_present(self, mock_get_radar, mock_get_county_data):
        """Tests that only present alert levels are returned."""
        mock_get_county_data.return_value = {
            "hazardOutlook": self.ghwo,
            "alerts": {
                "items": [
                    {"metadata": {"level": {"text": "other"}}},
                    {"metadata": {"level": {"text": "other"}}},
                    {"metadata": {"level": {"text": "warning"}}},
                    {"metadata": {"level": {"text": "other"}}},
                ],
            },
            "alertDays": [],
        }
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "33333"}))

        alert_levels = response.context["data"]["alert_levels"]

        # Make sure they are in the correct order,  and we only have the ones
        # that are actually represented in alerts.
        self.assertEqual(
            alert_levels,
            [
                {
                    "name": "warning",
                    "css_class": "wx_alert_map_legend--warning",
                    "translation_key": "alerts.legend.warning-area.01",
                },
                {
                    "name": "other",
                    "css_class": "wx_alert_map_legend--advisory",
                    "translation_key": "alerts.legend.advisory-area.01",
                },
            ],
        )

    @disable_logging_for_quieter_tests
    def test_overview_404(self):
        """Test the overview view."""
        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "99999"}))
        self.assertEqual(response.status_code, 404)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    def test_overview_500(self, mock_get_county_data):
        """Test county error case."""
        mock_get_county_data.side_effect = Exception
        with self.assertRaises(Exception):  # noqa: PT027, B017 (we want generic Exception)
            response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
            self.assertEqual(response.status_code, 500)
