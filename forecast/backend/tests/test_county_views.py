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
            slug="frankenstein-ma",
            state=self.state2,
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county3 = spatial.WeatherCounties.objects.create(
            countyname="Sanderson Sisters",
            countyfips="33333",
            st="MA",
            slug="sanderson-sisters-ma",
            state=self.state2,
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county3.cwas.set([cwa_with_no_wfo])
        self.county4 = spatial.WeatherCounties.objects.create(
            countyname="Anansi",
            countyfips="44444",
            st="GH",
            slug="anansi-gh",
            state=self.state3,
            shape=GEOSGeometry("POINT(0 0)"),
            primarywfo=cwa,
        )
        self.county4.cwas.set([cwa])
        self.county5 = spatial.WeatherCounties.objects.create(
            countyname="Keelut",
            countyfips="55555",
            st="AK",
            slug="keelut-ak",
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
        counties = list(mock_call[0][2]["states"][2].counties_list)

        # Assert that the order is alphabetical
        self.assertEqual(counties[0], self.county2)
        self.assertEqual(counties[1], self.county1)
        self.assertEqual(counties[2], self.county3)

    @mock.patch("backend.interop.get_county_data")
    def test_overview_link_to_county_risk_overview(self, mock_get_county_data):
        """Test that county overview links to detailed risk analysis."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
            "slug": "anansi-gh",
        }

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        link = reverse("county_risk_overview", kwargs={"county_fips": "44444"})
        self.assertContains(response, link)

    @mock.patch("backend.interop.get_county_data")
    def test_county_state_overview_link_to_county_risk_overview(self, mock_get_county_data):
        """Test that county overview links to detailed risk analysis."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
            "slug": "anansi-gh",
        }

        response = self.client.get(reverse("county_state_overview", kwargs={"county_slug": "Anansi-GH"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        link = reverse("county_risk_overview", kwargs={"county_fips": "44444"})
        self.assertContains(response, link)

    @mock.patch("backend.interop.get_county_data")
    def test_overview_without_timezone(self, mock_get_county_data):
        """Test the overview view without timezone."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
            "slug": "anansi-gh",
        }

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"],
            {
                "alert_levels": [],
                "alert_level_days": [],
                "bounds": None,
                "county_label": "Anansi County, GH",
                "primary_wfo": self.wfo,
                "public": {
                    "riskOverview": self.ghwo,
                    "alerts": {"items": []},
                    "alertDays": [],
                    "county": {"wfos": ["YND"]},
                    "weatherstories": [],
                    "briefings": [],
                    "slug": "anansi-gh",
                },
                "briefings": [],
                "weather_stories": [
                    {"is_empty": True, "officeId": "YND", "wfo_name": "Yondertown", "wfo_url": "/about/offices/YND/"}
                ],
                "wfo_codes": [self.wfo.code],
            },
        )

    @mock.patch("backend.interop.get_county_data")
    def test_overview_with_timezone(self, mock_get_county_data):
        """Test the overview view with timezone."""
        mock_get_county_data.return_value = {
            "riskOverview": self.ghwo,
            "alerts": {"items": []},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
            "slug": "",
        }

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "55555"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"],
            {
                "alert_levels": [],
                "alert_level_days": [],
                "bounds": None,
                "county_label": "Keelut Census Area, AK",
                "primary_wfo": self.wfo,
                "public": {
                    "riskOverview": self.ghwo,
                    "alerts": {"items": []},
                    "alertDays": [],
                    "county": {"wfos": ["YND"]},
                    "weatherstories": [],
                    "briefings": [],
                    "slug": "",
                },
                "briefings": [],
                "wfo_codes": [self.wfo.code],
                "weather_stories": [
                    {"is_empty": True, "officeId": "YND", "wfo_name": "Yondertown", "wfo_url": "/about/offices/YND/"}
                ],
            },
        )

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    def test_overview_with_no_wfo(self, mock_get_county_data):
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
            "slug": "",
        }

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "33333"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(
            response.context["data"],
            {
                "alert_level_days": [],
                "alert_levels": [],
                "bounds": None,
                "county_label": "Sanderson Sisters County, MA",
                "public": {
                    "alerts": {"items": []},
                    "alertDays": [],
                    "riskOverview": self.ghwo,
                    "county": {"wfos": []},
                    "weatherstories": [],
                    "briefings": [],
                    "slug": "",
                },
                "briefings": [],
                "weather_stories": [],
                "primary_wfo": None,
                "wfo_codes": [],
            },
        )

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    def test_alert_level_to_day_mapping(self, mock_get_county_data):
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
    def test_alert_levels_only_present(self, mock_get_county_data):
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
    def test_name_state_overview_404(self):
        """Test the overview view with county name, state."""
        response = self.client.get(reverse("county_state_overview", kwargs={"county_slug": "abc-xy"}))
        self.assertEqual(response.status_code, 404)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    def test_overview_500(self, mock_get_county_data):
        """Test county error case."""
        mock_get_county_data.side_effect = Exception
        with self.assertRaises(Exception):  # noqa: PT027, B017 (we want generic Exception)
            response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
            self.assertEqual(response.status_code, 500)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    def test_overview_renders_500_when_alerts_and_risk_overview_both_error(self, mock_get_county_data):
        """Test that when both alerts and risk overview have errors, the 500 page is rendered."""
        mock_get_county_data.return_value = {
            "alerts": {"items": [], "metadata": {"error": True}},
            "riskOverview": {"error": True},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
            "slug": "anansi-gh",
        }

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
        self.assertTemplateUsed(response, "errors/500.html")

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    def test_overview_renders_normally_when_only_alerts_error(self, mock_get_county_data):
        """Test that when only alerts has an error but risk overview is fine, the page still renders.

        Even if briefings and weather stories also fail, the page should render
        with non-critical-component-error partials for each failing component.
        """
        mock_get_county_data.return_value = {
            "alerts": {"items": [], "metadata": {"error": True}},
            "riskOverview": self.ghwo,
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [{"error": "connection refused", "officeId": "YND"}],
            "briefings": [{"error": "connection refused", "officeId": "YND"}],
            "slug": "anansi-gh",
        }

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["alerts_error"])
        # Verify the non-critical-component-error partial is rendered for alerts, weather stories, and briefings
        error_count = response.content.decode().count("non-critical-component-error")
        # The count includes one hidden (display-none) component (for the radar), so we expect 4 total
        self.assertEqual(error_count, 4)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.interop.get_county_data")
    def test_overview_renders_normally_when_only_risk_overview_error(self, mock_get_county_data):
        """Test that when only risk overview has an error but alerts are fine, the page still renders.

        The risk overview section should show the non-critical-component-error partial,
        while alerts render normally.
        """
        mock_get_county_data.return_value = {
            "alerts": {"items": [], "metadata": {"error": False}},
            "riskOverview": {"error": True},
            "alertDays": [],
            "county": {"wfos": ["YND"]},
            "weatherstories": [],
            "briefings": [],
            "slug": "anansi-gh",
        }

        response = self.client.get(reverse("county_overview", kwargs={"countyfips": "44444"}))
        self.assertTemplateUsed(response, "weather/county/overview.html")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.context["alerts_error"])
        # Verify the non-critical-component-error partial is rendered for risk overview
        error_count = response.content.decode().count("non-critical-component-error")
        # The count includes one hidden (display-none) component (for the radar), so we expect 2 total
        self.assertEqual(error_count, 2)
