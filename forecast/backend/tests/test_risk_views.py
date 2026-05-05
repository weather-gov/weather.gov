import json
from os import path
from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase
from django.urls import reverse

import backend.models as backend
import spatial.models as spatial
from backend.util import disable_logging_for_quieter_tests


class TestRiskViews(TestCase):
    """Tests our Django risk views."""

    def setUp(self):
        """Test setup."""
        ghwo_data_path = path.join(path.dirname(__file__), "data", "county_ghwo.json")
        with open(ghwo_data_path) as fp:
            self.county_ghwo_data = json.loads(fp.read())

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


    @mock.patch("backend.views.risk.get_ghwo_data_for_county")
    @mock.patch("backend.views.risk.get_ghwo_daily_images")
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

        response = self.client.get(reverse("county_risk_overview", kwargs={"county_fips": "44444"}))
        self.assertEqual(response.status_code, 200)

        # The risks should be sorted high -> med -> low based on sum of categories
        sorted_risks = list(response.context["ghwo"]["risks"].keys())
        self.assertEqual(sorted_risks, ["high_risk", "med_risk", "low_risk"])


    @mock.patch("backend.views.risk.get_ghwo_data_for_state")
    @mock.patch("backend.views.risk.get_ghwo_daily_images")
    def test_state_ghwo_severity_sorting(self, mock_get_images, mock_get_ghwo_data):
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

        response = self.client.get(reverse("state_risk_overview", kwargs={"state_code": self.state2.state}))
        self.assertEqual(response.status_code, 200)

        # The risks should be sorted high -> med -> low based on sum of categories
        sorted_risks = list(response.context["ghwo"]["risks"].keys())
        self.assertEqual(sorted_risks, ["high_risk", "med_risk", "low_risk"])


    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.risk.get_ghwo_data_for_county")
    @mock.patch("backend.views.risk.get_counties_combo_box_list")
    @mock.patch("backend.views.county.get_object_or_404", autospec=True)
    def test_county_ghwo_with_failed_interop_request(
        self,
        mock_get_object_or_404,
        mock_get_county_list,
        mock_get_ghwo_data_for_county,
    ):
        """Requesting a GHWO county details page returns 500 when GHWO interop request fails.

        This should cover when the interop crashes.
        """
        mock_get_county_list.return_value = []
        mock_get_ghwo_data_for_county.side_effect = Exception
        mock_county = mock.Mock()
        mock_county.state.fips.return_value = "1"
        mock_county.county.countyfips.return_value = "1"
        mock_get_object_or_404.return_value = mock_county

        with self.assertRaises(Exception):  # noqa: PT027, B017 (we want generic Exception)
            response = self.client.get(reverse("county_risk_overview", kwargs={"county_fips": "1"}))
            self.assertEqual(response.status_code, 500)

    @mock.patch("backend.views.risk.get_ghwo_data_for_county")
    @mock.patch("backend.views.risk.get_counties_combo_box_list")
    @mock.patch("backend.views.risk.get_object_or_404", autospec=True)
    def test_county_ghwo_with_error_interop_request(
        self,
        mock_get_object_or_404,
        mock_get_county_list,
        mock_get_ghwo_data_for_county,
    ):
        """Requesting a GHWO county details page returns an error.

        Make sure the user is aware that an error occured and that they should try again later.
        """
        mock_get_county_list.return_value = []
        mock_get_ghwo_data_for_county.return_value = {"error": "Error fetching GHWO for 1"}
        mock_county = mock.Mock()
        mock_county.state.fips.return_value = "1"
        mock_county.county.countyfips.return_value = "1"
        mock_county.timezone = "America/Denver"
        mock_get_object_or_404.return_value = mock_county

        response = self.client.get(reverse("county_risk_overview", kwargs={"county_fips": "1"}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")
        self.assertContains(response, "images/weather/wx_error-cloud_error")

    @mock.patch("backend.views.risk.get_ghwo_data_for_county")
    @mock.patch("backend.views.risk.get_counties_combo_box_list")
    @mock.patch("backend.views.risk.get_object_or_404", autospec=True)
    def test_county_ghwo_with_no_data_interop_request(
        self,
        mock_get_object_or_404,
        mock_get_county_list,
        mock_get_ghwo_data_for_county,
    ):
        """Requesting a GHWO county details page returns no data.

        Make sure the user is aware that no data is present for their chosen location.
        """
        mock_get_county_list.return_value = []
        mock_get_ghwo_data_for_county.return_value = {"error": "No GHWO found for 1"}
        mock_county = mock.Mock()
        mock_county.state.fips.return_value = "1"
        mock_county.county.countyfips.return_value = "1"
        mock_county.timezone = "America/New_York"
        mock_get_object_or_404.return_value = mock_county

        response = self.client.get(reverse("county_risk_overview", kwargs={"county_fips": "1"}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")
        self.assertContains(response, "images/weather/wx_error-cloud_missing")

    @mock.patch("backend.views.risk.get_ghwo_data_for_county")
    @mock.patch("backend.views.risk.get_counties_combo_box_list")
    @mock.patch("backend.views.risk.get_object_or_404")
    def test_county_ghwo_success(
        self,
        mock_get_object_or_404,
        mock_get_county_list,
        mock_get_ghwo_data_for_county,
    ):
        """Test the success case for requesting a GHWO county details page."""
        mock_get_county_list.return_value = []
        mock_get_ghwo_data_for_county.return_value = self.county_ghwo_data
        mock_county = mock.Mock()
        mock_county.state.fips.return_value = "1"
        mock_county.county.countyfips.return_value = "1"
        mock_county.timezone = "America/Chicago"
        mock_get_object_or_404.return_value = mock_county

        response = self.client.get(reverse("county_risk_overview", kwargs={"county_fips": "1"}))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/county/ghwo.html")

    @disable_logging_for_quieter_tests
    def test_risk_index_cannot_get(self):
        """Ensure that we cannot GET request on the county GHWO index page.

        This view is specifically designed to be POST only, as it will
        redirect the user to the corrrect county page.
        """
        response = self.client.get(reverse("risk_index"))

        # 405: Method Not Allowed
        self.assertEqual(response.status_code, 405)

    @disable_logging_for_quieter_tests
    @mock.patch("spatial.models.WeatherStates.objects.get")
    def test_risk_index_invalid_state_fips(self, mock_state_get):
        """Posting to the county ghwo index page with an invalid state fips 404s."""
        mock_state_get.side_effect = Exception

        response = self.client.post(
            reverse("risk_index"),
            {
                "current-state": "1",
                "state-select": "2",
                "county-select": "2",
            },
        )

        self.assertEqual(response.status_code, 404)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.county.WeatherCounties.objects.get")
    def test_risk_index_invalid_selected_county(self, mock_county_get):
        """Posting to the county ghwo index page with an invalid selected county fips 404s."""
        post_data = {
            "current-state": "51",
            "state-select": "51",
            "county-select": "1",
        }
        mock_county_get.side_effect = Exception

        response = self.client.post(
            reverse("risk_index"),
            post_data,
        )

        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.risk.WeatherCounties.objects")
    @mock.patch("backend.views.risk.WeatherStates.objects")
    def test_risk_index_valid_selected_state_redirects(self, mock_state_objects, mock_county_objects):
        """Posting to the county ghwo index page with a different selected state redirects to the state url."""
        post_data = {
            "current-state": "AK",
            "state": "DC",
            "county": "1",
        }

        mock_county = mock.MagicMock(countyfips="501")
        mock_county_objects.get.return_value = mock_county

        mock_state = mock.MagicMock(id="51")
        mock_state.state = "DC"
        mock_state_objects.get.return_value = mock_state

        response = self.client.post(
            reverse("risk_index"),
            post_data,
        )

        self.assertRedirects(
            response,
            reverse("state_risk_overview", kwargs={"state_code": "DC"}),
            fetch_redirect_response=False,
        )

    @mock.patch("backend.views.county.WeatherCounties.objects.get")
    def test_risk_index_valid_selected_county_redirects(self, mock_county_get):
        """Posting to the county ghwo index page with a valid selected county redirects to the proper url."""
        post_data = {
            "current-state": "51",
            "state": "51",
            "county": "1",
        }
        mock_county = mock.MagicMock(countyfips="1")
        mock_county_get.return_value = mock_county

        response = self.client.post(
            reverse("risk_index"),
            post_data,
        )

        self.assertRedirects(
            response,
            reverse("county_risk_overview", kwargs={"county_fips": "1"}),
            fetch_redirect_response=False,
        )

    @mock.patch("backend.views.county.WeatherCounties.objects.get")
    @mock.patch("backend.views.county.WeatherStates.objects.get")
    def test_risk_index_selected_county_is_all_redirects(self, mock_state_get, mock_county_get):
        """Posting to the risk index page with a selected county of 'all' redirects to the state url."""
        post_data = {
            "current-state": "VA",
            "state": "VA",
            "current-county": "51013",
            "county": "all"
        }
        mock_county = mock.MagicMock(countyfips="51013")
        mock_county_get.return_value = mock_county
        mock_state = mock.MagicMock(state="VA")
        mock_state_get.return_value = mock_state

        response = self.client.post(
            reverse("risk_index"),
            post_data
        )

        self.assertRedirects(
            response,
            reverse("state_risk_overview", kwargs={"state_code": "VA"}),
            fetch_redirect_response=False,
        )

    @disable_logging_for_quieter_tests
    def test_wx_select_ghwo_counties_cannot_get(self):
        """Ensure that we cannot GET request on the wx ghwo counties view.

        This view is specifically designed for POST only
        """
        response = self.client.get(reverse("wx_select_ghwo_counties"))

        # 405: Method Not Allowed
        self.assertEqual(response.status_code, 405)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.county.WeatherStates.objects.get")
    def test_wx_select_ghwo_counties_invalid_state_fips(self, mock_state_get):
        """Posting to wx select ghwo counties with an invalid state fips 404s."""
        mock_state_get.side_effect = Exception

        response = self.client.post(
            reverse("wx_select_ghwo_counties"),
            {
                "current-state": "1",
                "state-select": "2",
                "county-select": "2",
            },
        )

        self.assertEqual(response.status_code, 404)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.county.WeatherCounties.objects.get")
    def test_wx_select_ghwo_counties_invalid_selected_county(self, mock_county_get):
        """Posting to wx select ghwo counties with an invalid selected county fips 404s."""
        post_data = {
            "current-state": "51",
            "state-select": "51",
            "county-select": "1",
        }
        mock_county_get.side_effect = Exception

        response = self.client.post(
            reverse("wx_select_ghwo_counties"),
            post_data,
        )

        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.county.WeatherCounties.objects")
    @mock.patch("backend.views.county.WeatherStates.objects")
    def test_wx_select_ghwo_counties_valid_selected_state(self, mock_state_objects, mock_county_objects):
        """Posting to wx select ghwo counties endpoint with valid state renders the correct template partial."""
        post_data = {
            "current-state": "51",
            "state-select": "50",
            "county-select": "1",
        }

        mock_county = mock.MagicMock(countyfips="501")
        mock_county_objects.defer.return_value.filter.return_value.order_by.return_value.first.return_value = (
            mock_county
        )

        mock_state = mock.MagicMock(id="51")
        mock_state_objects.defer.get.return_value = mock_state

        response = self.client.post(
            reverse("wx_select_ghwo_counties"),
            post_data,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/wx-county-ghwo-selector.html")

    @mock.patch("backend.views.county.WeatherCounties.objects")
    def test_wx_select_ghwo_counties_valid_selected_county(self, mock_county_objects):
        """Posting to wx select ghwo counties endpoint with valid county renders the correct template partial."""
        post_data = {
            "current-state": "51",
            "state-select": "51",
            "county-select": "1",
        }
        mock_county = mock.MagicMock(countyfips="1")
        mock_county_objects.defer.return_value.get.return_value = mock_county

        response = self.client.post(
            reverse("wx_select_ghwo_counties"),
            post_data,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/wx-county-ghwo-selector.html")

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.county.WeatherCounties.objects.get")
    def test_wx_ghwo_counties_invalid_county_fips(self, mock_get_county):
        """Request to wx ghwo counties endpoint with invalid county fips 404s."""
        mock_get_county.side_effect = Exception

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "invalid fips"}),
        )

        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.partials.get_object_or_404")
    @mock.patch("backend.views.partials.interop.get_ghwo_data_for_county")
    def test_wx_ghwo_counties_with_no_data_interop_request(self, mock_get_ghwo_data_for_county, mock_get_object_or_404):
        """Request to wx ghwo counties endpoint with 404 interop ghwo data request 200s."""
        mock_get_ghwo_data_for_county.return_value = {"statusCode": 404, "error": "No GHWO found for 51013"}
        county = mock.Mock()
        county.timezone = "America/Los_Angeles"
        mock_get_object_or_404.return_value = county

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "51013"}),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")
        self.assertContains(response, "images/weather/wx_error-cloud_missing")

    @mock.patch("backend.views.partials.get_object_or_404")
    @mock.patch("backend.views.partials.interop.get_ghwo_data_for_county")
    def test_wx_ghwo_counties_with_error_interop_request(self, mock_get_ghwo_data_for_county, mock_get_object_or_404):
        """Request to wx ghwo counties endpoint with 500 interop ghwo data request 200s."""
        mock_get_ghwo_data_for_county.return_value = {"statusCode": 500, "error": "Error fetching GHWO for 51013"}
        mock_county_or_state = mock.Mock()
        mock_county_or_state.timezone = "America/New_York"
        mock_get_object_or_404.return_value = mock_county_or_state

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "51013"}),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")
        self.assertContains(response, "images/weather/wx_error-cloud_error")

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.county.interop.get_ghwo_data_for_county")
    def test_wx_ghwo_counties_failed_interop_request(self, mock_get_ghwo):
        """Request to wx ghwo counties endpoint with failing interop ghwo data request 404s."""
        mock_get_ghwo.side_effect = Exception

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "51013"}),
        )

        self.assertEqual(response.status_code, 404)

    @disable_logging_for_quieter_tests
    def test_wx_ghwo_counties_cannot_post(self):
        """Ensure we cannot POST on the wx ghwo counties partial endpoint."""
        response = self.client.post(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "valid"}),
            {},
        )

        # 405: Method Not Allowed
        self.assertEqual(response.status_code, 405)

    @mock.patch("backend.views.partials.get_object_or_404")
    @mock.patch("backend.views.county.interop.get_ghwo_data_for_county")
    def test_wx_ghwo_counties_success(self, mock_get_ghwo, mock_get_object_or_404):
        """Test successful request for wx ghwo counties partial."""
        mock_county_or_state = mock.Mock()
        mock_county_or_state.timezone = "America/New_York"
        mock_get_object_or_404.return_value = mock_county_or_state
        mock_get_ghwo.return_value = self.county_ghwo_data

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "valid"}),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")


    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.risk.get_ghwo_data_for_county")
    @mock.patch("backend.views.risk.get_counties_combo_box_list")
    @mock.patch("spatial.models.WeatherCounties.objects.get", autospec=True)
    def test_county_ghwo_with_invalid_county_fips(
        self,
        mock_get_county,
        mock_get_county_list,
        mock_get_ghwo_data_for_county,
    ):
        """Requesting a GHWO county details page for invalid county returns 404."""
        mock_get_county_list.return_value = []
        mock_get_ghwo_data_for_county.return_value = self.county_ghwo_data
        mock_get_county.side_effect = spatial.WeatherCounties.DoesNotExist

        response = self.client.get(reverse("county_risk_overview", kwargs={"county_fips": "1"}))

        self.assertEqual(response.status_code, 404)

