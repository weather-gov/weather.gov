import json
from os import path
from unittest import mock

from django.contrib.gis.geos import GEOSGeometry
from django.test import TestCase
from django.urls import reverse

import spatial.models as spatial
from backend import models
from backend.exceptions import Http429
from backend.util import disable_logging_for_quieter_tests


class TestViews(TestCase):
    """Tests our Django views."""

    def setUp(self):
        """Test setup."""
        ghwo_data_path = path.join(path.dirname(__file__), "data", "county_ghwo.json")
        with open(ghwo_data_path) as fp:
            self.county_ghwo_data = json.loads(fp.read())
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
            point=GEOSGeometry("POINT(30.12345 30.54321)"),
        )
        spatial.WeatherPlace.objects.create(
            name="New York",
            state="NY",
            point=GEOSGeometry("POINT(30 30)"),
        )
        cwa = spatial.WeatherCountyWarningAreas.objects.create(
            wfo="TST",
            shape=GEOSGeometry("POLYGON((3 7, 7 7, 7 3, 3 3, 3 7))"),
        )
        spatial.WeatherCounties.objects.create(
            countyname="Upper left",
            shape=GEOSGeometry("POLYGON((0 10, 5 10, 5 5, 0 5, 0 10))"),
            primarywfo=cwa,
            countyfips="12345",
        )
        spatial.WeatherCounties.objects.create(
            countyname="Upper right",
            shape=GEOSGeometry("POLYGON((5 10, 10 10, 10 5, 5 5, 5 10))"),
            primarywfo=cwa,
            countyfips="12346",
        )
        spatial.WeatherCounties.objects.create(
            countyname="Lower left",
            shape=GEOSGeometry("POLYGON((0 5, 5 5, 5 0, 0 0, 0 5))"),
            primarywfo=cwa,
            countyfips="12347",
        )
        spatial.WeatherCounties.objects.create(
            countyname="Lower right",
            shape=GEOSGeometry("POLYGON((5 5, 10 5, 10 0, 5 0, 5 5))"),
            primarywfo=cwa,
            countyfips="12348",
        )

        # Create example weather story and
        # patch calls to retrieve it
        self.weather_story = {
            "id": "7ccab810-706b-401c-8757-71f656e56270",
            "officeId": "LWX",
            "startTime": "2026-01-01T12:00:00+00:00",
            "endTime": "2027-01-01T12:00:00+00:00",
            "updateTime": "2026-01-10T12:00:00+00:00",
            "title": "Testing the test",
            "description": "This is a triumph. I'm making a note here: huge success",
            "altText": "Alternative to text? Pictures!",
            "priority": False,
            "order": 1,
            "image": "/public/images/wfos/LWX.png",
        }


    def test_index(self):
        """Test the index view."""
        response = self.client.get("/")
        self.assertTemplateUsed(response, "weather/index.html")

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_point_location(self, mock_get_point_forecast):
        """Test the point location view."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
            "place": {"timezone": "America/New_York"},
            "weatherstory": [self.weather_story]
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)
        self.assertTemplateUsed(response, "weather/point/overview.html")
        self.assertEqual(
            response.context["point"],
            {"grid": {"wfo": "TST"}, "wfo": self.wfo, "isMarine": False, "place": {"timezone": "America/New_York"}},
        )

        self.assertEqual(response.context["weather_story"], self.weather_story)

    def test_point_location_truncate(self):
        """Test the point location view where lat/lon needs to be truncated."""
        response = self.client.get("/point/1.234567/9.87654/")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, "/point/1.235/9.877/")

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_point_location_update(self, mock_get_point_forecast):
        """Test the point location view."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
            "place": {"timezone": "America/New_York"},
            "weatherstory": [self.weather_story]
        }

        response = self.client.get("/point/11.1/22.2?update", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)
        self.assertTemplateUsed(response, "weather/point/point.update.html")
        self.assertEqual(
            response.context["point"],
            {"grid": {"wfo": "TST"}, "wfo": self.wfo, "isMarine": False, "place": {"timezone": "America/New_York"}},
        )

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_point_location_no_weather_story(self, mock_get_point_forecast):
        """Test the point location view where there's no weather story available."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
            "place": {"timezone": "America/New_York"},
            "weatherstory": []
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)

        self.assertEqual(
            response.context["point"],
            {"grid": {"wfo": "TST"}, "wfo": self.wfo, "isMarine": False, "place": {"timezone": "America/New_York"}},
        )
        expected = {"is_empty": True, "officeId": "TST", "wfo_name": "Test WFO", "wfo_url": "/offices/TST/"}
        self.assertEqual(response.context["weather_story"], expected)
        self.assertTemplateUsed("weather/partials/point-weather-storys.html")

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_point_location_ok_weather_story(self, mock_get_point_forecast):
        """Test the point location renders with OK weather story."""
        weather_story = {
            "id": "7ccab810-706b-401c-8757-71f656e56270",
            "officeId": "TST",
            "startTime": "2026-01-01T12:00:00+00:00",
            "endTime": "2027-01-01T12:00:00+00:00",
            "updateTime": "2026-01-10T12:00:00+00:00",
            "title": "Testing the test",
            "description": "This is a triumph. I'm making a note here: huge success",
            "altText": "Alternative to text? Pictures!",
            "priority": False,
            "order": 1,
            "image": "/public/images/wfos/TST.png",
        }
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
            "place": {"timezone": "America/New_York"},
            "weatherstory": [weather_story]
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)

        self.assertEqual(
            response.context["point"],
            {"grid": {"wfo": "TST"}, "wfo": self.wfo, "isMarine": False, "place": {"timezone": "America/New_York"}},
        )
        self.assertEqual(response.context["weather_story"], weather_story)
        self.assertTemplateUsed("weather/partials/point-weather-story.html")

    @disable_logging_for_quieter_tests
    def test_point_location_with_lat_too_high(self):
        """Test the point location view when the latitude is over 90."""
        response = self.client.get("/point/127/22.2", follow=True)

        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, "errors/404/point-out-of-bounds.html")

    @disable_logging_for_quieter_tests
    def test_point_location_with_lat_too_low(self):
        """Test the point location view when the latitude is below -90."""
        response = self.client.get("/point/-93.623/22.2", follow=True)

        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, "errors/404/point-out-of-bounds.html")

    @disable_logging_for_quieter_tests
    def test_point_location_with_lon_too_high(self):
        """Test the point location view when the longitude is over 180."""
        response = self.client.get("/point/43.342/181", follow=True)

        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, "errors/404/point-out-of-bounds.html")

    @disable_logging_for_quieter_tests
    def test_point_location_with_lon_too_low(self):
        """Test the point location view when the longitude is below -180."""
        response = self.client.get("/point/127/-197", follow=True)

        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, "errors/404/point-out-of-bounds.html")

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.point.interop.get_point_forecast")
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

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_point_location_with_unsupported_point(self, mock_get_point_forecast):
        """Test the point location view when the requested point is not supported."""
        mock_get_point_forecast.return_value = {
            "error": True,
            "status": 200,
            "reason": "not-supported",
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/point/overview.html")

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_point_location_with_minimal_data(self, mock_get_point_forecast):
        """Test the point location view when we have alerts but no forecast."""
        mock_get_point_forecast.return_value = {
            "error": True,
            "status": 200,
            "reason": "not-supported",
            "alerts": {
                "items": [{"alert": True}],
            },
            "place": {
                "county": "Upper left",
                "countyfips": "12345",
                "name": "Test Region",
            },
            "point": {
                "latitude": 11.1,
                "longitude": 22.22,
            },
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/point/overview.html")
        self.assertNotContains(response, "daily-tab-button")
        self.assertContains(response, "alerts-tab-button")

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_point_location_with_api_500_interop_200(self, mock_get_point_forecast):
        """Test the point location where no valid API data is returned by the interop."""
        mock_get_point_forecast.return_value = {
            "forecast": {"error": True},
            "satellite": {"error": True},
            "observations": {"error": True},
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        mock_get_point_forecast.assert_called_once_with(11.1, 22.2)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/point/overview.html")
        self.assertTemplateUsed(response, "weather/partials/uswds-alert.html")

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.point.interop.get_point_forecast", side_effect=Http429())
    def test_point_location_interop_429(self, mock_interop_get_point_forecast):  # noqa: ARG002
        """Test that the point location renders 429 when interop does."""
        response = self.client.get("/point/11.1/22.2", follow=True)

        self.assertEqual(response.status_code, 429)
        self.assertTemplateUsed(response, "errors/429.html")

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_marine_point(self, mock_get_point_forecast):
        """Test that a marine point renders the right template."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": True,
        }

        response = self.client.get("/point/11.1/22.2", follow=True)

        self.assertTemplateUsed(response, "errors/404/marine-point.html")

    @disable_logging_for_quieter_tests
    def test_place_unknown(self):
        """Test the place location view with an unknown place."""
        response = self.client.get("/place/NJ/Not_Hoboken/")
        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_place_redirect_state(self, mock_get_point_forecast):
        """Test the place location view where the state needs redirection."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
            "place": {"timezone": "America/New_York"},
            "weatherstory": []
        }
        response = self.client.get("/place/nj/Hoboken/")
        self.assertRedirects(response, "/place/NJ/Hoboken/")

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_place_redirect_place(self, mock_get_point_forecast):
        """Test the place location view where the place name needs redirection."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
            "place": {"timezone": "America/New_York"},
            "weatherstory": []
        }
        response = self.client.get("/place/NY/New York/")
        self.assertRedirects(response, "/place/NY/New_York/")

    @mock.patch("backend.views.point.interop.get_point_forecast")
    def test_place(self, mock_get_point_forecast):
        """Test the place location view where the place name needs redirection."""
        mock_get_point_forecast.return_value = {
            "grid": {"wfo": "TST"},
            "isMarine": False,
            "place": {"timezone": "America/New_York"},
            "weatherstory": [self.weather_story],
        }
        response = self.client.get("/place/NJ/Hoboken/")
        self.assertTemplateUsed(response, "weather/point/overview.html")

        # These values should come from the WeatherPlace model. The lat/lon
        # from the place should be truncated to 3 decimal places.
        mock_get_point_forecast.assert_called_once_with(30.543, 30.123)
        self.assertTemplateUsed(response, "weather/point/overview.html")
        self.assertEqual(
            response.context["point"],
            {"grid": {"wfo": "TST"}, "wfo": self.wfo, "isMarine": False, "place": {"timezone": "America/New_York"}},
        )

        self.assertEqual(response.context["weather_story"], self.weather_story)

    def test_office_specific(self):
        """Test the specific-office view."""
        response = self.client.get("/offices/HUN", follow=True)  # use a pre-existing WFO so that the image can be found
        self.assertTemplateUsed(response, "weather/office/overview.html")
        self.assertEqual(response.context["office"], models.WFO.objects.get(code="HUN"))

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

    @mock.patch("backend.views.partials.interop.get_wx_afd_versions")
    @mock.patch("backend.views.partials.interop.get_wx_afd_by_id")
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

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.partials.interop.get_wx_afd_versions_by_wfo")
    def test_afd_by_office_exception(self, mock_get_wx_afd_versions_by_wfo):
        """Test getting an AFD by office where the office is unknown."""
        mock_get_wx_afd_versions_by_wfo.side_effect = models.WFO.DoesNotExist()
        response = self.client.get("/afd/TST/")
        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.partials.interop.get_wx_afd_versions_by_wfo")
    def test_afd_by_office(self, mock_get_wx_afd_versions_by_wfo):
        """Test getting an AFD by office."""
        mock_get_wx_afd_versions_by_wfo.return_value = {"@graph": [{"id": "magic_afd"}]}
        response = self.client.get("/afd/TST/")
        self.assertRedirects(
            response,
            "/afd/tst/magic_afd/",
            fetch_redirect_response=False,
        )

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.partials.interop.get_wx_afd_by_id")
    def test_afd_by_office_and_id_with_exception(self, mock_get_wx_afd_by_id):
        """Test getting an AFD by office and ID where there is an exception."""
        mock_get_wx_afd_by_id.side_effect = models.WFO.DoesNotExist()
        response = self.client.get("/afd/TST/afd_id/")
        self.assertEqual(response.status_code, 404)

    @mock.patch("backend.views.partials.interop.get_wx_afd_by_id")
    def test_afd_by_office_and_id_with_redirect_wfo(self, mock_get_wx_afd_by_id):
        """Test getting an AFD by office and ID where the WFOs don't match."""
        mock_get_wx_afd_by_id.return_value = {"issuingOffice": "KTST"}
        response = self.client.get("/afd/BOB/afd_id/")
        self.assertRedirects(
            response,
            "/afd/bob/",
            fetch_redirect_response=False,
        )

    @mock.patch("backend.views.partials.interop.get_wx_afd_by_id")
    @mock.patch("backend.views.partials.interop.get_wx_afd_versions_by_wfo")
    def test_afd_by_office_and_id(
        self,
        mock_get_wx_afd_versions_by_wfo,
        mock_get_wx_afd_by_id,
    ):
        """Test getting an AFD by office and ID."""
        mock_get_wx_afd_by_id.return_value = {"issuingOffice": "KBOB"}
        mock_get_wx_afd_versions_by_wfo.return_value = {"@graph": ["v1", "v2", "v3"]}

        response = self.client.get("/afd/bob/afd_id/")

        self.assertTemplateUsed(response, "weather/afd/afd_page.html")

        # For this view, the context is merged into the larger object instead
        # of creating a unique key, so we'll need to test each piece
        # individually rather that comparing the whole thing. (Django puts a lot
        # more stuff into the context than just what our views provide.)
        self.assertEqual(response.context["wfo"], "BOB")
        self.assertEqual(response.context["afd"], {"issuingOffice": "KBOB"})
        self.assertEqual(response.context["version_list"], ["v1", "v2", "v3"])

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.index.interop.get_health")
    def test_health_not_okay(self, mock_get_health):
        """Test the health endpoint returning not okay."""
        mock_get_health.return_value = "no"
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 503)

    @mock.patch("backend.views.index.interop.get_health")
    def test_health__okay(self, mock_get_health):
        """Test the health endpoint returning okay."""
        mock_get_health.return_value = {"ok": True}
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.county.interop.get_ghwo_data_for_county")
    @mock.patch("backend.views.county.get_counties_combo_box_list")
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

        response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "1"}))

        self.assertEqual(response.status_code, 404)

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.county.interop.get_ghwo_data_for_county")
    @mock.patch("backend.views.county.get_counties_combo_box_list")
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
            response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "1"}))
            self.assertEqual(response.status_code, 500)

    @mock.patch("backend.views.county.interop.get_ghwo_data_for_county")
    @mock.patch("backend.views.county.get_counties_combo_box_list")
    @mock.patch("backend.views.county.get_object_or_404", autospec=True)
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

        response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "1"}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")
        self.assertContains(response, "images/weather/wx_error-cloud_error")

    @mock.patch("backend.views.county.interop.get_ghwo_data_for_county")
    @mock.patch("backend.views.county.get_counties_combo_box_list")
    @mock.patch("backend.views.county.get_object_or_404", autospec=True)
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

        response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "1"}))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")
        self.assertContains(response, "images/weather/wx_error-cloud_missing")

    @mock.patch("backend.views.county.interop.get_ghwo_data_for_county")
    @mock.patch("backend.views.county.get_counties_combo_box_list")
    @mock.patch("backend.views.county.get_object_or_404")
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

        response = self.client.get(reverse("county_ghwo", kwargs={"county_fips": "1"}))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/county/ghwo.html")

    @disable_logging_for_quieter_tests
    def test_county_ghwo_index_cannot_get(self):
        """Ensure that we cannot GET request on the county GHWO index page.

        This view is specifically designed to be POST only, as it will
        redirect the user to the corrrect county page.
        """
        response = self.client.get(reverse("county_ghwo_index"))

        # 405: Method Not Allowed
        self.assertEqual(response.status_code, 405)

    @disable_logging_for_quieter_tests
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

    @disable_logging_for_quieter_tests
    @mock.patch("backend.views.county.WeatherCounties.objects.get")
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

    @mock.patch("backend.views.county.WeatherCounties.objects")
    @mock.patch("backend.views.county.WeatherStates.objects")
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

    @mock.patch("backend.views.county.WeatherCounties.objects.get")
    def test_county_ghwo_index_valid_selected_county_redirects(self, mock_county_get):
        """Posting to the county ghwo index page with a valid selected county redirects to the proper url."""
        post_data = {
            "current-state": "51",
            "state": "51",
            "county": "1",
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
        mock_get_object_or_404.return_value = mock.Mock()

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
        mock_get_object_or_404.return_value = mock.MagicMock()
        mock_get_ghwo.return_value = self.county_ghwo_data

        response = self.client.get(
            reverse("wx_ghwo_counties", kwargs={"county_fips": "valid"}),
        )

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "weather/partials/ghwo-details.html")
