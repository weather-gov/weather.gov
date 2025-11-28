from datetime import datetime
from unittest import mock

from django.test import TestCase

from backend import util


class TestGHWOProcessing(TestCase):
    """Test the processing of GHWO data for display in templates."""

    def setUp(self):
        """Set up the test data needed for each test."""
        pass

    def test_get_ghwo_daily_images(self):
        """
        Test getting a set of the images from all days.

        We expect to only retrieve unique image
        urls across days for risk factors greater
        than 0.
        """
        data = {
            "days": [
                {
                    "images": {
                        "Lightning": "lightning_url",
                        "SnowSleet": "snowsleet_url",
                        "FireWeather": "fireweather_url",
                    },
                    "Lightning": 1,
                    "SnowSleet": 0,
                    "FireWeather": 4,
                    "UnknownRiskType": 3,
                    "timestamp": "aTimestamp",
                    "dayNumber": 1,
                },
            ],
        }

        urls = util.get_ghwo_daily_images(data)

        self.assertIn("lightning_url", urls)
        self.assertIn("fireweather_url", urls)
        self.assertNotIn("snowsleet_url", urls)
        self.assertEqual(len(urls), 2)

    def test_get_risk_factor_ids(self):
        """Test getting a full list of unique risk factor ids from ghwo days."""
        data = {
            "days": [
                {
                    "FireWeather": 1,
                    "timestamp": "aTimestamp",
                    "ExcessiveRainfall": 0,
                    "DailyComposite:": 5,
                    "dayNumber": 2,
                },
                {
                    "NonConvectiveWind": 0,
                    "IceAccumulation": 1,
                    "timestamp": "aTimestamp",
                    "dayNumber": 2,
                },
            ],
        }

        risk_ids = util._get_risk_factor_ids(data)

        expect_to_have = [
            "FireWeather",
            "IceAccumulation",
        ]
        expect_to_not_have = [
            "timestamp",
            "ExcessiveRainfall",
            "DailyComposite",
            "dayNumber",
            "NonConvectiveWind",
        ]

        for should_have in expect_to_have:
            self.assertIn(should_have, risk_ids)

        for should_not_have in expect_to_not_have:
            self.assertNotIn(should_not_have, risk_ids)

    @mock.patch("backend.util.get_object_or_404")
    def test_get_risk_daily_rows(self, mock_get_wfo):
        """
        Test the processing of GHWO data into a structure of rows.

        The output data structure will be one more amenable to
        creating table rows in the template(s).
        """
        mock_wfo = mock.Mock()
        mock_get_wfo.return_value = mock_wfo
        mock_wfo.ghwo_metadata = {
            "Lightning": util._make_generic_metadata_for_risk("Lightning"),
            "ExtremeCold": util._make_generic_metadata_for_risk("ExtremeCold"),
            "SevereThunderstorm": util._make_generic_metadata_for_risk("SevereThunderstorm"),
        }

        data = {
            "wfo": "okx",
            "days": [
                {
                    "Lightning": 3,
                    "dayNumber": 1,
                    "ExtremeCold": 0,
                    "SevereThunderstorm": 1,
                    "DailyComposite": 3,
                    "timestamp": "2025-11-04T19:00:00-05:00",
                    "Tornado": 0,
                    "images": {},
                },
                {
                    "Lightning": 2,
                    "dayNumber": 2,
                    "ExtremeCold": 4,
                    "SevereThunderstorm": 0,
                    "DailyComposite": 4,
                    "timestamp": "2025-11-05T07:00:00-05:00",
                    "Tornado": 0,
                    "images": {},
                },
                {
                    "Lightning": 0,
                    "dayNumber": 3,
                    "ExtremeCold": 2,
                    "SevereThunderstorm": 0,
                    "DailyComposite": 2,
                    "timestamp": "2025-11-06T07:00:00-05:00",
                    "Tornado": 0,
                    "images": {},
                },
            ],
        }

        risk_ids = ["Lightning", "ExtremeCold", "SevereThunderstorm"]

        processed_data = util._get_risk_daily_rows(risk_ids, data)
        self.assertEqual(len(processed_data), 3)

        # Lightning row
        first_row = processed_data[0]
        self.assertEqual(first_row["risk"]["id"], "Lightning")
        expected_first_row_days = [
            {
                "level": {
                    "label": "Elevated",
                    "number": 3,
                    "description": "Description for elevated Lightning level here",
                },
                "timestamp": "2025-11-04T19:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-04T19:00:00-05:00"),
                "day_number": 1,
                "image": None,
            },
            {
                "level": {
                    "label": "Limited",
                    "number": 2,
                    "description": "Description for limited Lightning level here",
                },
                "timestamp": "2025-11-05T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-05T07:00:00-05:00"),
                "day_number": 2,
                "image": None,
            },
            {
                "level": {
                    "label": "None",
                    "number": 0,
                    "description": "No risk for Lightning",
                },
                "timestamp": "2025-11-06T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-06T07:00:00-05:00"),
                "day_number": 3,
                "image": None,
            },
        ]
        self.assertEqual(expected_first_row_days, first_row["days"])

        # ExtremeCold
        second_row = processed_data[1]
        self.assertEqual(second_row["risk"]["id"], "ExtremeCold")
        expected_second_row_days = [
            {
                "level": {
                    "label": "None",
                    "number": 0,
                    "description": "No risk for ExtremeCold",
                },
                "timestamp": "2025-11-04T19:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-04T19:00:00-05:00"),
                "day_number": 1,
                "image": None,
            },
            {
                "level": {
                    "label": "Significant",
                    "number": 4,
                    "description": "Description for significant ExtremeCold level here",
                },
                "timestamp": "2025-11-05T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-05T07:00:00-05:00"),
                "day_number": 2,
                "image": None,
            },
            {
                "level": {
                    "label": "Limited",
                    "number": 2,
                    "description": "Description for limited ExtremeCold level here",
                },
                "timestamp": "2025-11-06T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-06T07:00:00-05:00"),
                "day_number": 3,
                "image": None,
            },
        ]
        self.assertEqual(expected_second_row_days, second_row["days"])

        # SevereThunderstorm
        third_row = processed_data[2]
        self.assertEqual(third_row["risk"]["id"], "SevereThunderstorm")
        expected_third_row_days = [
            {
                "level": {
                    "label": "Low",
                    "number": 1,
                    "description": "Description for low SevereThunderstorm level here",
                },
                "timestamp": "2025-11-04T19:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-04T19:00:00-05:00"),
                "day_number": 1,
                "image": None,
            },
            {
                "level": {
                    "label": "None",
                    "number": 0,
                    "description": "No risk for SevereThunderstorm",
                },
                "timestamp": "2025-11-05T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-05T07:00:00-05:00"),
                "day_number": 2,
                "image": None,
            },
            {
                "level": {
                    "label": "None",
                    "number": 0,
                    "description": "No risk for SevereThunderstorm",
                },
                "timestamp": "2025-11-06T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-06T07:00:00-05:00"),
                "day_number": 3,
                "image": None,
            },
        ]
        self.assertEqual(expected_third_row_days, third_row["days"])

    def test_set_first_selected_days_no_rows(self):
        """
        Ensure we bail from the function when the passed list of rows is empty.

        Should not raise any exceptions
        """
        input = []
        expected = []
        util._set_first_selected_day(input)

        self.assertEqual(input, expected)

    def test_set_first_selected_days_picks_first_by_time(self):
        """Ensure we are picking the earliest non-zero level to set."""
        input = [
            {
                "days": [
                    {
                        "level": {
                            "number": 0,
                        },
                    },
                    {
                        "level": {
                            "number": 0,
                        },
                    },
                    {
                        "level": {
                            "number": 3,
                        },
                    },
                ],
            },
            {
                "days": [
                    {
                        "level": {
                            "number": 1,
                        },
                    },
                    {
                        "level": {
                            "number": 0,
                        },
                    },
                    {
                        "level": {
                            "number": 3,
                        },
                    },
                ],
            },
        ]

        expected = [
            {
                "days": [
                    {
                        "level": {
                            "number": 0,
                        },
                    },
                    {
                        "level": {
                            "number": 0,
                        },
                    },
                    {
                        "level": {
                            "number": 3,
                        },
                    },
                ],
            },
            {
                "days": [
                    {
                        "level": {
                            "number": 1,
                        },
                        "is_first": True,
                    },
                    {
                        "level": {
                            "number": 0,
                        },
                    },
                    {
                        "level": {
                            "number": 3,
                        },
                    },
                ],
            },
        ]

        util._set_first_selected_day(input)

        self.assertEqual(input, expected)

    def test_get_no_impact_risk_labels(self):
        """Ensure we return correct example of no impact risk labels."""
        data = {
            "wfo": "okx",
            "days": [
                {
                    "Lightning": 3,
                    "dayNumber": 1,
                    "ExtremeCold": 0,
                    "SevereThunderstorm": 1,
                    "DailyComposite": 3,
                    "timestamp": "2025-11-04T19:00:00-05:00",
                    "Tornado": 0,
                    "SomeUnknownRisk": 0,
                    "images": {},
                },
                {
                    "Lightning": 2,
                    "dayNumber": 2,
                    "ExtremeCold": 0,
                    "SevereThunderstorm": 0,
                    "DailyComposite": 4,
                    "timestamp": "2025-11-05T07:00:00-05:00",
                    "Tornado": 0,
                    "SomeUnknownRisk": 0,
                    "images": {},
                },
            ],
        }

        # Modified from the set given as a const in
        # util.GHWO_RISK_MAPPINGS
        expected = [
            "Blowing Dust Risk",
            "Coastal Flood Risk",
            "Thunderstorm Wind Risk",
            "Excessive Rainfall Risk",
            "Extreme Cold Risk",
            "Extreme Heat Risk",
            "Fire Weather Risk",
            "Fog Risk",
            "Freezing Spray Risk",
            "Frost/Freeze Risk",
            "Hail Risk",
            "High Surf Risk",
            "Ice Accumulation Risk",
            "Lakeshore Flood Risk",
            # There is a lightning risk, so
            # we don't expect it
            # 'Lightning Risk',
            "Marine Hazard Risk",
            "Wind Risk",
            "Rip Current Risk",
            # There is a severe thunderstorm risk,
            # so we don't expect it
            # 'Severe Thunderstorm Risk',
            "Snow/Sleet Risk",
            "Swim Risk",
            "Tornado Risk",
        ].sort()

        actual = util.get_no_impact_risk_labels(data).sort()

        self.assertEqual(expected, actual)
