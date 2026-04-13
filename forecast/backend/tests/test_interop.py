import json
import os
from unittest import TestCase, mock

import responses

from backend import interop
from backend.exceptions import Http429
from spatial import models


class TestInteropInterface(TestCase):
    """Tests the interop interface module."""

    @responses.activate
    def test_get_wx_afd_versions_default_url(self):
        """
        Tests that we fetch from the right URL.

        This test additionally tests that if the API_URL environment variable
        is empty, we fallback to the default api.weather.gov.
        """
        os.environ["API_URL"] = ""
        responses.add(
            responses.GET,
            "https://api.weather.gov/products/types/AFD",
            json={"hello": "world"},
            status=200,
        )
        actual = interop.get_wx_afd_versions()

        self.assertEqual(actual, {"hello": "world"})

    @responses.activate
    def test_get_wx_afd_versions_specified_url(self):
        """
        Tests that we fetch from the right URL.

        This test additionally tests that if the API_URL environment variable
        is set, we use it. Note that this pair of tests are effectively doing
        double-duty to validate API_URL handling.
        """
        os.environ["API_URL"] = "https://gonzo"
        responses.add(
            responses.GET,
            "https://gonzo/products/types/AFD",
            json={"rizzo": "rat"},
            status=200,
        )
        actual = interop.get_wx_afd_versions()

        self.assertEqual(actual, {"rizzo": "rat"})

    @responses.activate
    def test_get_wx_afd_versions_by_wfo(self):
        """Tests that we get AFD versions using a WFO."""
        os.environ["API_URL"] = ""
        responses.add(
            responses.GET,
            "https://api.weather.gov/products/types/AFD/locations/BOB",
            json={"bob": "weatherman"},
            status=200,
        )
        actual = interop.get_wx_afd_versions_by_wfo("BOB")

        self.assertEqual(actual, {"bob": "weatherman"})

    @responses.activate
    def test_get_wx_afd_by_id(self):
        """Tests that we fetch an AFD based on ID."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/products/a-plus-number-one-afd",
            json={"afd": "is number one"},
            status=200,
        )
        actual = interop.get_wx_afd_by_id("a-plus-number-one-afd")

        self.assertEqual(actual, {"afd": "is number one"})

    @responses.activate
    def test_health_endpoint(self):
        """Tests that we fetch the interop health endpoint."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/",
            json={"healthy": True},
            status=200,
        )
        actual = interop.get_health()

        self.assertEqual(actual, {"healthy": True})

    with open(os.path.join(os.path.dirname(__file__), "data/forecast.json")) as f:
        forecast = json.load(f)

    @responses.activate
    def test_datetimes_are_converted(self):
        """Tests that datetimes are converted to the right timezone."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/1/2",
            json=self.forecast["some_missing_temperatures"],
            status=200,
        )

        actual = interop.get_point_forecast(1, 2)

        # The timestamps coming from the interop are only guaranteed to be
        # ISO 8601 strings. Within our Python code, we will parse those into
        # datetime objects with the appropriate place-local timezone. These
        # tests are for that logic.

        # Observation timestamp
        self.assertEqual(
            actual["observed"]["timestamp"].isoformat(),
            "2009-03-19T12:32:42-05:00",
        )

        # Day start and end times
        self.assertEqual(
            actual["forecast"]["days"][0]["start"].isoformat(),
            "2009-01-02T07:00:00-06:00",
        )
        self.assertEqual(
            actual["forecast"]["days"][0]["end"].isoformat(),
            "2009-01-02T13:00:00-06:00",
        )

        # Period start and end times
        self.assertEqual(
            actual["forecast"]["days"][0]["periods"][0]["start"].isoformat(),
            "2009-01-02T07:00:00-06:00",
        )
        self.assertEqual(
            actual["forecast"]["days"][0]["periods"][0]["end"].isoformat(),
            "2009-01-02T08:00:00-06:00",
        )

        # Daily hour times
        self.assertEqual(
            actual["forecast"]["days"][0]["hours"][0]["time"].isoformat(),
            "2009-08-31T22:00:00-05:00",
        )

        # QPF period start and end times
        self.assertEqual(
            actual["forecast"]["days"][0]["qpf"]["periods"][0]["start"].isoformat(),
            "2025-12-15T02:00:00-06:00",
        )
        self.assertEqual(
            actual["forecast"]["days"][0]["qpf"]["periods"][0]["end"].isoformat(),
            "2025-12-15T04:00:00-06:00",
        )

    @responses.activate
    @mock.patch("backend.interop._")
    def test_point_forecast_minimum(self, mock_gettext_lazy):
        """
        Tests the minimum point forecast.

        Tests this arrangement of data:
            - QPF has no snow
            - QPF has no ice
            - There are no alerts
        """
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/1/2",
            json=self.forecast["nosnow_noice_noalerts"],
            status=200,
        )

        actual = interop.get_point_forecast(1, 2)

        forecast = actual["forecast"]
        day1 = forecast["days"][0]
        day2 = forecast["days"][1]
        hourly = day1["hourly"]
        qpf = day1["qpf"]

        # For the basic case, we're just going to assert all the things that
        # explicitly set by the interop interface module.
        self.assertEqual(len(forecast["days"]), 3)
        self.assertEqual(day1["isNightPeriod"], False)
        self.assertEqual(day1["id"], "20090102T130000Z")
        self.assertEqual(day1["itemId"], "20090102T130000Z")
        self.assertEqual(day1["dayId"], "20090102T130000Z")
        self.assertEqual(day1["temps"], [100, 30])
        self.assertEqual(day1["low"], 30)
        self.assertEqual(day1["high"], 100)
        self.assertEqual(day1["pop"], 3)
        self.assertEqual(day1["numPeriods"], 2)
        self.assertEqual(day1["hasAlertIcon"], False)

        # Ensure if the probability of precipitation for the day is null, we
        # fallback to zero. This shouldn't happen but there's check code so
        # let's test it.
        self.assertEqual(day2["pop"], 0)

        # Check the hourly things are gathered up
        self.assertEqual(hourly["feelsLike"], [45, 48])
        self.assertEqual(hourly["temps"], [49, 51])
        self.assertEqual(hourly["pops"], [27, 13])
        self.assertEqual(hourly["dewpoints"], [88, 9])
        self.assertEqual(hourly["relativeHumidity"], [400, 35])
        self.assertEqual(hourly["windSpeeds"], [3, 9])
        self.assertEqual(hourly["windGusts"], [175, 4])
        self.assertEqual(hourly["windDirections"], ["yonder", "north"])

        # And the QPF stuff too
        self.assertEqual(qpf["times"], ["2am-4am", "4am-7am"])
        self.assertEqual(qpf["liquid"], [3, 0.03])

        # And finally, validate that the translation lookup was called with
        # the expected key.
        mock_gettext_lazy.assert_called_with("precip-table.table-header+legend.rain.01")

    @responses.activate
    def test_point_forecast_some_null_temps(self):
        """Test point forecast processing where some temps are None."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/1/9",
            json=self.forecast["some_missing_temperatures"],
            status=200,
        )

        result = interop.get_point_forecast(1, 9)
        last_day = result["forecast"]["days"][-1]
        self.assertEqual(last_day["low"], 19)

    @responses.activate
    def test_point_forecast_day2_nighttime(self):
        """Tests a day being nighttime."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/2/3",
            json=self.forecast["nosnow_noice_noalerts"],
            status=200,
        )

        actual = interop.get_point_forecast(2, 3)

        day2 = actual["forecast"]["days"][1]
        self.assertEqual(day2["isNightPeriod"], True)

    @responses.activate
    def test_point_forecast_day3_not_nighttime(self):
        """Tests a day with 3 periods not being nighttime."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/3/4",
            json=self.forecast["nosnow_noice_noalerts"],
            status=200,
        )

        actual = interop.get_point_forecast(3, 4)

        day3 = actual["forecast"]["days"][2]
        self.assertEqual(day3["isNightPeriod"], False)

    @responses.activate
    @mock.patch("backend.interop._")
    def test_point_forecast_withsnow(self, mock_gettext_lazy):
        """Tests a day with snow."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/4/5",
            json=self.forecast["snow_noice_alert_noalertlevel"],
            status=200,
        )

        actual = interop.get_point_forecast(4, 5)

        qpf = actual["forecast"]["days"][0]["qpf"]

        # And the QPF stuff too
        self.assertEqual(qpf["liquid"], [3, 0.03])
        self.assertEqual(qpf["snow"], [17, 4])

        # And finally, validate that the translation lookup was called with
        # the expected key.
        mock_gettext_lazy.assert_called_with("precip-table.table-header+legend.water.01")

    @responses.activate
    @mock.patch("backend.interop._")
    def test_point_forecast_withice(self, mock_gettext_lazy):
        """Tests a day with ice."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/5/6",
            json=self.forecast["nosnow_ice_alert"],
            status=200,
        )

        actual = interop.get_point_forecast(5, 6)

        qpf = actual["forecast"]["days"][0]["qpf"]

        # And the QPF stuff too
        self.assertEqual(qpf["liquid"], [3, 0.03])
        self.assertEqual(qpf["ice"], [3, 6])

        # And finally, validate that the translation lookup was called with
        # the expected key.
        mock_gettext_lazy.assert_called_with("precip-table.table-header+legend.water.01")

    @responses.activate
    def test_point_forecast_alert_nolevel(self):
        """Tests a day with one or more alerts but no highest level."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/6/7",
            json=self.forecast["snow_noice_alert_noalertlevel"],
            status=200,
        )

        actual = interop.get_point_forecast(6, 7)

        day1 = actual["forecast"]["days"][0]
        self.assertEqual(day1["hasAlertIcon"], False)

    @responses.activate
    def test_point_forecast_get_alerts(self):
        """Tests that alert IDs are replaced with alert JSON."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/6/7",
            json=self.forecast["nosnow_ice_alert"],
            status=200,
        )

        alert1 = {"id": 1, "onset": "1990-01-01T00:00:00Z"}
        alert2 = {"id": 2, "onset": "1990-01-01T00:00:00Z"}
        alert3 = {"id": 3, "onset": "1990-01-01T00:00:00Z"}

        models.WeatherAlertsCache.objects.create(hash="alert-id-1", alertjson=alert1, counties="", states="")
        models.WeatherAlertsCache.objects.create(hash="alert-id-2", alertjson=alert2, counties="", states="")
        models.WeatherAlertsCache.objects.create(hash="alert-id-3", alertjson=alert3, counties="", states="")

        actual = interop.get_point_forecast(6, 7)

        self.assertEqual(
            [alert["id"] for alert in actual["alerts"]["items"]],
            [alert1["id"], alert2["id"], alert3["id"]],
        )

    @responses.activate
    def test_point_forecast_alert(self):
        """Tests a day with one or more alerts and a highest level."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/7/8",
            json=self.forecast["nosnow_ice_alert"],
            status=200,
        )

        actual = interop.get_point_forecast(7, 8)

        day1 = actual["forecast"]["days"][0]
        self.assertEqual(day1["hasAlertIcon"], True)

    @responses.activate
    def test_point_with_error(self):
        """Tests that an error response is passed straight back."""
        returned = {"error": True, "key": "value"}

        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(responses.GET, "https://interop/point/9/10", json=returned, status=404)

        actual = interop.get_point_forecast(9, 10)

        self.assertEqual(actual, returned)

    @responses.activate
    @mock.patch("spatial.models.WeatherAlertsCache.objects")
    def test_get_point_alerts_are_sorted(self, filter_mock):
        """Tests that alerts are hydrated in the same order as returned by interop."""
        # The mock data has alerts laid out like this:
        #     alert-id-1, alert-id-2, alert-id-3
        #
        # Let's return them in a different order from the
        # model so we can ensure it is sorted afterwards.
        alert1 = mock.MagicMock(spec=models.WeatherAlertsCache)
        alert1.hash = "alert-id-1"
        alert1.alertjson = {"id": "alert 1", "onset": "1990-01-01T00:00:00Z"}

        alert2 = mock.MagicMock(spec=models.WeatherAlertsCache)
        alert2.hash = "alert-id-2"
        alert2.alertjson = {"id": "alert 2", "onset": "1991-01-01T00:00:00Z"}

        alert3 = mock.MagicMock(spec=models.WeatherAlertsCache)
        alert3.hash = "alert-id-3"
        alert3.alertjson = {"id": "alert 3", "onset": "1992-01-01T00:00:00Z"}

        # Return them in a wonky order.
        filter_mock.only.return_value.filter.return_value = [alert2, alert3, alert1]

        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/7/8",
            json=self.forecast["nosnow_ice_alert"],
            status=200,
        )

        actual = interop.get_point_forecast(7, 8)

        alerts = actual["alerts"]["items"]
        self.assertEqual(len(alerts), 3)
        self.assertEqual(actual["alerts"]["items"][0]["id"], "alert 1")
        self.assertEqual(actual["alerts"]["items"][1]["id"], "alert 2")
        self.assertEqual(actual["alerts"]["items"][2]["id"], "alert 3")

    @responses.activate
    def test_get_radar(self):
        """Tests that we get radar metadata."""
        returned = {"message": "some radar metadata"}
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(responses.GET, "https://interop/radar/9/10", json=returned, status=200)

        actual = interop.get_radar(9, 10)

        self.assertEqual(actual, returned)

    @responses.activate
    def test_get_county_data(self):
        """Tests that we get county data."""
        returned = {"message": "some county data"}
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(responses.GET, "https://interop/county/11223", json=returned, status=200)

        actual = interop.get_county_data("11223")

        self.assertEqual(actual, returned)

    @mock.patch("backend.interop._requests_session.get")
    def test__fetch_with_429(self, mock_get): # noqa: ARG002
        """Tests that fetch will raise the 429 exception on 429."""
        mock_response = mock.Mock()
        mock_response.status_code = 429
        mock_get.return_value = mock_response

        with self.assertRaises(Http429): # noqa: PT027
            interop._fetch("/point/anything")

    @mock.patch("backend.interop._fetch", side_effect=Http429())
    def test_get_point_forecast_429(self, mock_fetch): # noqa: ARG002
        """Tests that get_point_forecast will handle the 429 from fetch."""
        with self.assertRaises(Http429): # noqa: PT027
            interop.get_point_forecast(11.1, 22.2)


