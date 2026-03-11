import json
import os
from unittest import TestCase

import responses

from backend import interop


class TestInteropAstronomicalData(TestCase):
    """Tests astronomical data handling in the interop module."""

    with open(os.path.join(os.path.dirname(__file__), "data/forecast.json")) as f:
        forecast = json.load(f)

    @responses.activate
    def test_no_astronomical_data(self):
        """Tests that there are no errors if astronomical data is missing."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/1/2",
            json=self.forecast["astronomical_data_missing"],
            status=200,
        )

        actual = interop.get_point_forecast(1, 2)
        self.assertEqual("astronomicalData" in actual["point"], False, "there is no astronomical data")

    @responses.activate
    def test_emtpy_astronomical_data(self):
        """Tests that there are no errors if astronomical data is empty."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/1/2",
            json=self.forecast["astronomical_data_empty"],
            status=200,
        )

        actual = interop.get_point_forecast(1, 2)

        self.assertEqual("astronomicalData" in actual["point"], True, "there is astronomical data")

    @responses.activate
    def test_happy_path(self):
        """Tests that astronomical data is processed as expected."""
        os.environ["INTEROP_URL"] = "https://interop"
        responses.add(
            responses.GET,
            "https://interop/point/1/2",
            json=self.forecast["astronomical_data_valid"],
            status=200,
        )

        actual = interop.get_point_forecast(1, 2)
        self.assertEqual("astronomicalData" in actual["point"], True, "there is astronomical data")

        astro = actual["point"]["astronomicalData"]

        self.assertEqual(astro["dayLength"], "14h 27m", "day length is calculated")
        self.assertEqual(astro["dayLightLength"], "22h 18m", "visible day length is calculated")

        # The timestamps coming from the interop are only guaranteed to be
        # ISO 8601 strings. Within our Python code, we will parse those into
        # datetime objects with the appropriate place-local timezone. These
        # tests are for that logic.

        self.assertEqual(
            astro["sunrise"].isoformat(),
            "2023-04-19T07:14:32-05:00",
            "formats sunrise",
        )
        self.assertEqual(
            astro["sunset"].isoformat(),
            "2023-04-19T21:41:03-05:00",
            "formats sunset",
        )
        self.assertEqual(
            astro["civilTwilightBegin"].isoformat(),
            "2022-12-31T18:00:00-06:00",
            "formats civil twilight begin",
        )
        self.assertEqual(
            astro["civilTwilightEnd"].isoformat(),
            "2023-01-01T16:18:00-06:00",
            "formats civil twilight end",
        )
        self.assertEqual(
            astro["nauticalTwilightBegin"].isoformat(),
            "2025-12-31T18:00:00-06:00",
            "formats nautical twilight begin",
        )
        self.assertEqual(
            astro["nauticalTwilightEnd"].isoformat(),
            "2026-01-01T12:00:00-06:00",
            "formats nautical twilight end",
        )
        self.assertEqual(
            astro["astronomicalTwilightBegin"].isoformat(),
            "2026-03-05T18:00:00-06:00",
            "formats astronomical twilight begin",
        )
        self.assertEqual(
            astro["astronomicalTwilightEnd"].isoformat(),
            "2026-03-06T12:00:00-06:00",
            "formats astronomical twilight end",
        )
