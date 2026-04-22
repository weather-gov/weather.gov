from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.http import HttpResponse
from django.test import TestCase
from django.urls import reverse

import backend.models as backend
import spatial.models as spatial
from backend.util import disable_logging_for_quieter_tests


class TestCountyViews(TestCase):
    """Tests our Django county views."""

    def setUp(self):
        """Test setup."""
        self.maxDiff = None
        region = backend.Region.objects.create(name="Regional Area")
        self.wfo = backend.WFO.objects.create(
            name="Yondertown",
            code="YND",
            region=region,
        )

        cwa = spatial.WeatherCountyWarningAreas.objects.create(
            wfo="YND",
            shape=GEOSGeometry("POINT(0 0)"),
        )
        cwa_with_no_wfo = spatial.WeatherCountyWarningAreas.objects.create(wfo="NOP", shape=GEOSGeometry("POINT(0 0)"))

        self.state1 = spatial.WeatherStates.objects.create(
            state="AK",
            name="Alaska",
            county_count=10,
            fips=90,
            timezone="America/Anchorage",
            shape=GEOSGeometry("POINT(0 0)"),
        )

        self.state2 = spatial.WeatherStates.objects.create(
            state="MA",
            name="Mass",
            county_count=10,
            fips=90,
            timezone="America/New_York",
            shape=GEOSGeometry("POINT(0 0)"),
        )

        self.state3 = spatial.WeatherStates.objects.create(
            state="GH",
            name="Ghert",
            county_count=10,
            fips=92,
            timezone="UTC",
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
            {"value": self.state1.state, "text": self.state1.name},
            response.context["state_list_items"],
        )
        self.assertIn(
            self.state2,
            response.context["states"],
        )
        self.assertIn(
            {"value": self.state2.state, "text": self.state2.name},
            response.context["state_list_items"],
        )
        self.assertIn(
            self.state3,
            response.context["states"],
        )
        self.assertIn(
            {"value": self.state3.state, "text": self.state3.name},
            response.context["state_list_items"],
        )

    @mock.patch("backend.views.county.render")
    def test_index_county_name_sorting(self, mock_render):
        """Test that index page counties are in alphabetical order."""
        # Hook into the call to render() so that we can
        # access the queried states objects and their counties
        mock_render.return_value = HttpResponse()
        self.client.get(reverse("county_index"))
        mock_call = mock_render.call_args

        # We want to pull out the MA State object
        # and ensure that its constituent counties are in
        # alphabetical order. It's the 3rd state.
        # Then get the list of its related counties
        counties = list(mock_call[0][2]["states"][2].counties.all())

        # Assert that the order is alphabetical
        self.assertEqual(counties[0], self.county2)
        self.assertEqual(counties[1], self.county1)
        self.assertEqual(counties[2], self.county3)

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_link_to_county_ghwo(self, mock_get_radar, mock_get_county_data):
        """Test that county overview links to detailed risk analysis."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
        }
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        link = reverse("county_ghwo", kwargs={"county_fips": "44444"})
        self.assertContains(response, link)

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_without_timezone(self, mock_get_radar, mock_get_county_data):
        """Test the overview view without timezone."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
        }
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
                "public": {
                    "riskOverview": self.ghwo,
                    "alerts": {"items": []},
                    "alertDays": [],
                    "county": {"wfos": ["YND"]},
                    "weatherstories": [],
                    "briefings": [],
                },
                "briefings": [],
                "weather_stories": [
                    {"is_empty": True, "officeId": "YND", "wfo_name": "Yondertown", "wfo_url": "/offices/YND/"}
                ],
                "radar": {"radarMetadata": {}},
                "wfo_codes": [self.wfo.code],
            },
        )

    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_timezone(self, mock_get_radar, mock_get_county_data):
        """Test the overview view with timezone."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
        }
        mock_get_radar.return_value = {"radarMetadata": {}}

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "55555"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"],
            {
                "alert_levels": [],
                "alert_level_days": [],
                "county_label": "Keelut Census Area, AK",
                "primary_wfo": self.wfo,
                "public": {
                    "riskOverview": self.ghwo,
                    "alerts": {"items": []},
                    "alertDays": [],
                    "county": {"wfos": ["YND"]},
                    "weatherstories": [],
                    "briefings": [],
                },
                "briefings": [],
                "radar": {"radarMetadata": {}},
                "wfo_codes": [self.wfo.code],
                "weather_stories": [
                    {"is_empty": True, "officeId": "YND", "wfo_name": "Yondertown", "wfo_url": "/offices/YND/"}
                ],
            },
        )

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_overview_with_no_wfo(self, mock_get_radar, mock_get_county_data):
        """Test the overview view where the county doesn't map to a WFO.

        This is an error condition, but we don't want it to crash the UX.
        """
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {"wfos": []},
            "weatherstories": [],
            "briefings": [],
        }
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
                    "riskOverview": self.ghwo,
                    "county": {"wfos": []},
                    "weatherstories": [],
                    "briefings": [],
                },
                "briefings": [],
                "weather_stories": [],
                "radar": {"radarMetadata": {}},
                "primary_wfo": None,
                "wfo_codes": [],
            },
        )

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    @mock.patch("backend.interop.get_radar")
    def test_alert_level_to_day_mapping(self, mock_get_radar, mock_get_county_data):
        """Tests that the levels for alerts on given days are mapped correctly."""
        mock_get_county_data.return_value = {
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
            "riskOverview": self.ghwo,
            "alerts": {
                "items": [
                    {"event": "Tsunami Warning", "metadata": {"level": {"text": "warning"}}, "hash": "h1"},
                    {"event": "Tornado Warning", "metadata": {"level": {"text": "other"}}, "hash": "h2"},
                    {"event": "Extreme Wind Warning", "metadata": {"level": {"text": "watch"}}, "hash": "h3"},
                    {"event": "Severe Thunderstorm Warning", "metadata": {"level": {"text": "watch"}}, "hash": "h4"},
                ],
            },
            "alertDays": [
                {
                    "day": "Oneday",
                    "start": "1998-04-12T09:00:00Z",
                    "end": "1998-04-13T06:00:00Z",
                    "alerts": [2, 1],
                },  # watch, other
                {
                    "day": "Today",
                    "start": "1983-11-04T09:00:00-06:00",
                    "end": "1983-11-05T06:00:00-06:00",
                    "alerts": [1, 0],
                },  # other, warning
                {
                    "day": "3sday",
                    "start": "2014-12-31T23:59:59+03:00",
                    "end": "2015-01-01T06:00:00+03:00",
                    "alerts": [0, 3],
                },  # warning, watch
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
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
            "riskOverview": self.ghwo,
            "alerts": {
                "items": [
                    {"event": "Tsunami Warning", "metadata": {"level": {"text": "other"}}, "hash": "h1"},
                    {"event": "Tornado Warning", "metadata": {"level": {"text": "warning"}}, "hash": "h2"},
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

    @mock.patch("backend.interop.get_ghwo_data_for_county")
    @mock.patch("backend.util.get_ghwo_daily_images")
    def test_county_ghwo_severity_sorting(self, mock_get_images, mock_get_ghwo_data):
        """Test that risks are sorted descending by their total severity across days."""
        mock_get_ghwo_data.return_value = {
            "wfo": "YND",
            "legend": {},
            "composite": {
                "days": [
                    {"timestamp": "2026-03-30T12:00:00Z", "scaled": 0},
                    {"timestamp": "2026-03-31T12:00:00Z", "scaled": 5},
                ]
            },
            "days": [
                {"timestamp": "2026-03-30T12:00:00Z"},
                {"timestamp": "2026-03-31T12:00:00Z"},
            ],
            "risks": {
                "low_risk": {
                    "days": [
                        {
                            "category": 0,
                            "timestamp": "2026-03-30T12:00:00Z",
                            "start": "2026-03-30T12:00:00Z",
                            "end": "2026-03-31T12:00:00Z",
                        },
                        {
                            "category": 1,
                            "timestamp": "2026-03-31T12:00:00Z",
                            "start": "2026-03-31T12:00:00Z",
                            "end": "2026-04-01T12:00:00Z",
                        },
                    ]
                },
                "high_risk": {
                    "days": [
                        {
                            "category": 4,
                            "timestamp": "2026-03-30T12:00:00Z",
                            "start": "2026-03-30T12:00:00Z",
                            "end": "2026-03-31T12:00:00Z",
                        },
                        {
                            "category": 5,
                            "timestamp": "2026-03-31T12:00:00Z",
                            "start": "2026-03-31T12:00:00Z",
                            "end": "2026-04-01T12:00:00Z",
                        },
                    ]
                },
                "med_risk": {
                    "days": [
                        {
                            "category": 2,
                            "timestamp": "2026-03-30T12:00:00Z",
                            "start": "2026-03-30T12:00:00Z",
                            "end": "2026-03-31T12:00:00Z",
                        },
                        {
                            "category": 1,
                            "timestamp": "2026-03-31T12:00:00Z",
                            "start": "2026-03-31T12:00:00Z",
                            "end": "2026-04-01T12:00:00Z",
                        },
                    ]
                },
            },
        }
        mock_get_images.return_value = []

        response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "44444"}))
        self.assertEqual(response.status_code, 200)

        # The risks should be sorted high -> med -> low based on sum of categories
        sorted_risks = list(response.context["ghwo"]["risks"].keys())
        self.assertEqual(sorted_risks, ["high_risk", "med_risk", "low_risk"])
