from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase
from django.urls import reverse

import spatial.models as spatial
from backend import models


class TestViews(TestCase):
    """Tests our Django views."""

    def setUp(self):
        """Test setup."""
        self.region = models.Region.objects.create(name="Test Region")
        self.wfo = models.WFO.objects.create(
            code="TST",
            name="Test WFO",
            region=self.region,
        )
        models.WFO.objects.create(
            code="AAA",
            name="Alphabet Start",
            region=self.region,
        )
        models.WFO.objects.create(
            code="ZZZ",
            name="Alphabet End",
            region=self.region,
        )
        spatial.WeatherPlace.objects.create(
            name="Hoboken",
            state="NJ",
            point=GEOSGeometry("POINT(30 30)"),
        )
        spatial.WeatherPlace.objects.create(
            name="New York",
            state="NY",
            point=GEOSGeometry("POINT(30 30)"),
        )

    def test_index(self):
        """Test the index view."""
        response = self.client.get("/")
        self.assertTemplateUsed(response, "weather/index.html")

    @mock.patch("backend.views.interop.get_point_forecast")
    def test_point_location(self, mock_get_point_forecast):
        """Test the point location view."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)
        self.assertTemplateUsed(response, "weather/point.html")
        self.assertEqual(
            response.context["point"],
            {
                "grid": {"wfo": "TST"},
                "wfo": self.wfo,
                "isMarine": False,
            },
        )

    @mock.patch("backend.views.interop.get_point_forecast")
    def test_point_location_with_out_of_bounds(self, mock_get_point_forecast):
        """Test the point location view when the requested point is out of bounds."""
        mock_get_point_forecast.return_value = {
            "error": True,
            "status": 404,
            "reason": "out-of-bounds",
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)
        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, "errors/404/point-out-of-bounds.html")

    @mock.patch("backend.views.interop.get_point_forecast")
    def test_point_location_with_unsupported_point(self, mock_get_point_forecast):
        """Test the point location view when the requested point is not supported."""
        mock_get_point_forecast.return_value = {
            "error": True,
            "status": 404,
            "reason": "not-supported",
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)
        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, "errors/404/point-not-supported.html")

    @mock.patch("backend.views.interop.get_point_forecast")
    def test_marine_point(self, mock_get_point_forecast):
        """Test that a marine point renders the right template."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": True,
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        self.assertTemplateUsed(response, "weather/marine-point.html")

    def test_place_unknown(self):
        """Test the place location view with an unknown place."""
        response = self.client.get("/place/NJ/Not_Hoboken/")
        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.interop.get_point_forecast")
    def test_place_redirect_state(self, mock_get_point_forecast):
        """Test the place location view where the state needs redirection."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
        }
        response = self.client.get("/place/nj/Hoboken/")
        self.assertRedirects(response, "/place/NJ/Hoboken/")

    @mock.patch("backend.views.interop.get_point_forecast")
    def test_place_redirect_place(self, mock_get_point_forecast):
        """Test the place location view where the place name needs redirection."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
        }
        response = self.client.get("/place/NY/New York/")
        self.assertRedirects(response, "/place/NY/New_York/")

    @mock.patch("backend.views.interop.get_point_forecast")
    def test_place(self, mock_get_point_forecast):
        """Test the place location view where the place name needs redirection."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
        }
        response = self.client.get("/place/NJ/Hoboken/")
        self.assertTemplateUsed(response, "weather/point.html")

        # These values should come from the WeatherPlace model
        mock_get_point_forecast.assert_called_once_with(30, 30)
        self.assertTemplateUsed(response, "weather/point.html")
        self.assertEqual(
            response.context["point"],
            {
                "grid": {"wfo": "TST"},
                "wfo": self.wfo,
                "isMarine": False,
            },
        )

    def test_office_specific(self):
        """Test the specific-office view."""
        response = self.client.get("/offices/TST", follow=True)
        self.assertTemplateUsed(response, "weather/office.html")
        self.assertEqual(response.context["office"], self.wfo)

    def test_afd_index_with_wfo_changed(self):
        """Tests getting the AFD index where the WFO changed."""
        response = self.client.get("/afd/?wfo=WFO")
        self.assertRedirects(
            response,
            "/afd/wfo/",
            fetch_redirect_response=False,
        )

    def test_afd_index_with_afd_changed(self):
        """Tests getting the AFD index where the AFD changed."""
        response = self.client.get("/afd/?wfo=WFO&id=AFD&current-wfo=WFO")
        self.assertRedirects(
            response,
            "/afd/wfo/AFD/",
            fetch_redirect_response=False,
        )

    def test_afd_index_with_wfo_and_afd_changed(self):
        """Tests getting the AFD index where the WFO and AFD changed."""
        response = self.client.get("/afd/?wfo=WFO&id=AFD")
        self.assertRedirects(
            response,
            "/afd/wfo/AFD/",
            fetch_redirect_response=False,
        )

    @mock.patch("backend.views.interop.get_wx_afd_versions")
    @mock.patch("backend.views.interop.get_wx_afd_by_id")
    def test_afd_index(self, mock_get_wx_afd_by_id, mock_get_wx_afd_versions):
        """Tests getting the AFD index."""
        mock_get_wx_afd_versions.return_value = {"@graph": [{"id": "afd_id"}]}
        mock_get_wx_afd_by_id.return_value = {"issuingOffice": "KTST"}

        response = self.client.get("/afd/")
        self.assertRedirects(
            response,
            "/afd/tst/afd_id/",
            fetch_redirect_response=False,
        )

    @mock.patch("backend.views.interop.get_wx_afd_versions_by_wfo")
    def test_afd_by_office_exception(self, mock_get_wx_afd_versions_by_wfo):
        """Test getting an AFD by office where the office is unknown."""
        mock_get_wx_afd_versions_by_wfo.side_effect = models.WFO.DoesNotExist()
        response = self.client.get("/afd/TST/")
        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.interop.get_wx_afd_versions_by_wfo")
    def test_afd_by_office(self, mock_get_wx_afd_versions_by_wfo):
        """Test getting an AFD by office."""
        mock_get_wx_afd_versions_by_wfo.return_value = {"@graph": [{"id": "magic_afd"}]}
        response = self.client.get("/afd/TST/")
        self.assertRedirects(
            response,
            "/afd/tst/magic_afd/",
            fetch_redirect_response=False,
        )

    @mock.patch("backend.views.interop.get_wx_afd_by_id")
    def test_afd_by_office_and_id_with_exception(self, mock_get_wx_afd_by_id):
        """Test getting an AFD by office and ID where there is an exception."""
        mock_get_wx_afd_by_id.side_effect = models.WFO.DoesNotExist()
        response = self.client.get("/afd/TST/afd_id/")
        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.interop.get_wx_afd_by_id")
    def test_afd_by_office_and_id_with_redirect_wfo(self, mock_get_wx_afd_by_id):
        """Test getting an AFD by office and ID where the WFOs don't match."""
        mock_get_wx_afd_by_id.return_value = {"issuingOffice": "KTST"}
        response = self.client.get("/afd/BOB/afd_id/")
        self.assertRedirects(
            response,
            "/afd/bob/",
            fetch_redirect_response=False,
        )

    @mock.patch("backend.views.interop.get_wx_afd_by_id")
    @mock.patch("backend.views.interop.get_wx_afd_versions_by_wfo")
    def test_afd_by_office_and_id(
        self,
        mock_get_wx_afd_versions_by_wfo,
        mock_get_wx_afd_by_id,
    ):
        """Test getting an AFD by office and ID."""
        mock_get_wx_afd_by_id.return_value = {"issuingOffice": "KBOB"}
        mock_get_wx_afd_versions_by_wfo.return_value = {"@graph": ["v1", "v2", "v3"]}

        response = self.client.get("/afd/bob/afd_id/")

        self.assertTemplateUsed(response, "weather/afd-page.html")

        # For this view, the context is merged into the larger object instead
        # of creating a unique key, so we'll need to test each piece
        # individually rather that comparing the whole thing. (Django puts a lot
        # more stuff into the context than just what our views provide.)
        self.assertEqual(response.context["wfo"], "BOB")
        self.assertEqual(response.context["afd"], {"issuingOffice": "KBOB"})
        self.assertEqual(response.context["version_list"], ["v1", "v2", "v3"])

    @mock.patch("backend.views.interop.get_health")
    def test_health_not_okay(self, mock_get_health):
        """Test the health endpoint returning not okay."""
        mock_get_health.return_value = "no"
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 503)

    @mock.patch("backend.views.interop.get_health")
    def test_health__okay(self, mock_get_health):
        """Test the health endpoint returning okay."""
        mock_get_health.return_value = {"ok": True}
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)


    @mock.patch("backend.views.interop.get_ghwo_data_for_county")
    @mock.patch("backend.views.get_counties_combo_box_list")
    @mock.patch("spatial.models.WeatherCounties.objects.get", autospec=True)
    def test_county_ghwo_with_invalid_county_fips(
            self,
            mock_get_county,
            mock_get_county_list,
            mock_get_ghwo_data_for_county,
    ):
        """Requesting a GHWO county details page for invalid county returns 404."""
        mock_get_county_list.return_value = []
        mock_get_ghwo_data_for_county.return_value = {}
        mock_get_county.side_effect = spatial.WeatherCounties.DoesNotExist

        response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "1"}))

        self.assertEqual(response.status_code, 404)



    @mock.patch("backend.views.interop.get_ghwo_data_for_county")
    @mock.patch("backend.views.get_counties_combo_box_list")
    @mock.patch("spatial.models.WeatherCounties.objects.get", autospec=True)
    def test_county_ghwo_with_failed_interop_request(
            self,
            mock_get_county,
            mock_get_county_list,
            mock_get_ghwo_data_for_county,
    ):
        """Requesting a GHWO county details page returns 404 when GHWO interop request fails.

        This should cover anything from the interop crashing to the GHWO
        data simply not being available for the given county.
        """
        mock_get_county_list.return_value = []
        mock_get_ghwo_data_for_county.side_effect = Exception
        mock_county = mock.Mock()
        mock_county.state.fips.return_value = "1"
        mock_county.county.countyfips.return_value = "1"
        mock_get_county.return_value = mock_county

        response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "1"}))

        self.assertEqual(response.status_code, 404)


    @mock.patch("backend.views.interop.get_ghwo_data_for_county")
    @mock.patch("backend.views.get_counties_combo_box_list")
    @mock.patch("spatial.models.WeatherCounties.objects.get", autospec=True)
    def test_county_ghwo_success(
            self,
            mock_get_county,
            mock_get_county_list,
            mock_get_ghwo_data_for_county,
    ):
        """Test the success case for rerquesting a GHWO county details page."""
        mock_get_county_list.return_value = []
        mock_get_ghwo_data_for_county.return_value = {}
        mock_county = mock.Mock()
        mock_county.state.fips.return_value = "1"
        mock_county.county.countyfips.return_value = "1"
        mock_get_county.return_value = mock_county

        response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "1"}))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/county/ghwo.html")

    def test_county_ghwo_index_cannot_get(self):
        """Ensure that we cannot GET request on the county GHWO index page.

        This view is specifically designed to be POST only, as it will
        redirect the user to the corrrect county page.
        """
        response = self.client.get(reverse("county_ghwo_index"))

        # 405: Method Not Allowed
        self.assertEqual(response.status_code, 405)

    @mock.patch("spatial.models.WeatherStates.objects.get")
    def test_county_ghwo_index_invalid_state_fips(self, mock_state_get):
        """Posting to the county ghwo index page with an invalid state fips 404s."""
        mock_state_get.side_effect = Exception

        response = self.client.post(
            reverse("county_ghwo_index"),
            {
                "current-state": "1",
                "state-select": "2",
                "county-select": "2",
            },
        )

        self.assertEqual(response.status_code, 404)


    @mock.patch("backend.views.WeatherCounties.objects.get")
    def test_county_ghwo_index_invalid_selected_county(self, mock_county_get):
        """Posting to the county ghwo index page with an invalid selected county fips 404s."""
        post_data = {
            "current-state": "51",
            "state-select": "51",
            "county-select": "1",
        }
        mock_county_get.side_effect = Exception

        response = self.client.post(
            reverse("county_ghwo_index"),
            post_data,
        )

        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.WeatherCounties.objects")
    @mock.patch("backend.views.WeatherStates.objects")
    def test_county_ghwo_index_valid_selected_state_redirects(self, mock_state_objects, mock_county_objects):
        """Posting to the county ghwo index page with a valid selected state redirects to the proper url."""
        post_data = {
            "current-state": "51",
            "state-select": "50",

            "county-select": "1",
        }

        mock_county = mock.MagicMock(countyfips="501")
        mock_county_objects.filter.return_value.order_by.return_value.first.return_value = mock_county

        mock_state = mock.MagicMock(id="51")
        mock_state_objects.get.return_value = mock_state

        response = self.client.post(
            reverse("county_ghwo_index"),
            post_data,
        )

        self.assertRedirects(
            response,
            reverse("county_ghwo", kwargs={"county_fips": "501"}),
            fetch_redirect_response=False,
        )

    @mock.patch("backend.views.WeatherCounties.objects.get")
    def test_county_ghwo_index_valid_selected_county_redirects(self, mock_county_get):
        """Posting to the county ghwo index page with a valid selected county redirects to the proper url."""
        post_data = {
            "current-state": "51",
            "state-select": "51",
            "county-select": "1",
        }
        mock_county = mock.MagicMock(countyfips="1")
        mock_county_get.return_value = mock_county

        response = self.client.post(
            reverse("county_ghwo_index"),
            post_data,
        )

        self.assertRedirects(
            response,
            reverse("county_ghwo", kwargs={"county_fips": "1"}),
            fetch_redirect_response=False,
        )

    def test_wx_select_ghwo_counties_cannot_get(self):
        """Ensure that we cannot GET request on the wx ghwo counties view.

        This view is specifically designed for POST only
        """
        response = self.client.get(reverse("wx_select_ghwo_counties"))

        # 405: Method Not Allowed
        self.assertEqual(response.status_code, 405)


    @mock.patch("backend.views.WeatherStates.objects.get")
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


    @mock.patch("backend.views.WeatherCounties.objects.get")
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


    @mock.patch("backend.views.WeatherCounties.objects")
    @mock.patch("backend.views.WeatherStates.objects")
    def test_wx_select_ghwo_counties_valid_selected_state(self, mock_state_objects, mock_county_objects):
        """Posting to wx select ghwo counties endpoint with valid state renders the correct template partial."""
        post_data = {
            "current-state": "51",
            "state-select": "50",

            "county-select": "1",
        }

        mock_county = mock.MagicMock(countyfips="501")
        mock_county_objects.filter.return_value.order_by.return_value.first.return_value = mock_county

        mock_state = mock.MagicMock(id="51")
        mock_state_objects.get.return_value = mock_state

        response = self.client.post(
            reverse("wx_select_ghwo_counties"),
            post_data,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/wx-county-ghwo-selector.html")

    @mock.patch("backend.views.WeatherCounties.objects.get")
    def test_wx_select_ghwo_counties_valid_selected_county(self, mock_county_get):
        """Posting to wx select ghwo counties endpoint with valid county renders the correct template partial."""
        post_data = {
            "current-state": "51",
            "state-select": "51",
            "county-select": "1",
        }
        mock_county = mock.MagicMock(countyfips="1")
        mock_county_get.return_value = mock_county

        response = self.client.post(
            reverse("wx_select_ghwo_counties"),
            post_data,
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/wx-county-ghwo-selector.html")

    @mock.patch("backend.views.WeatherCounties.objects.get")
    def test_wx_ghwo_counties_invalid_county_fips(self, mock_get_county):
        """Request to wx ghwo counties endpoint with invalid county fips 404s."""
        mock_get_county.side_effect = Exception

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "invalid fips"}),
        )

        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.interop.get_ghwo_data_for_county")
    def test_wx_ghwo_counties_failed_interop_request(self, mock_get_ghwo):
        """Request to wx ghwo counties endpoint with failing interop ghwo data request 404s."""
        mock_get_ghwo.side_effect = Exception

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "51013"}),
        )

        self.assertEqual(response.status_code, 404)

    def test_wx_ghwo_counties_cannot_post(self):
        """Ensure we cannot POST on the wx ghwo counties partial endpoint."""
        response = self.client.post(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "valid"}),
            {},
        )

        # 405: Method Not Allowed
        self.assertEqual(response.status_code, 405)

    @mock.patch("backend.views.WeatherCounties.objects.get")
    @mock.patch("backend.views.interop.get_ghwo_data_for_county")
    def test_wx_ghwo_counties_success(self, mock_get_ghwo, mock_get_county):
        """Test successful request for wx ghwo counties partial."""
        mock_get_county.return_value = mock.MagicMock()
        mock_get_ghwo.return_value = {}

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "valid"}),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")
