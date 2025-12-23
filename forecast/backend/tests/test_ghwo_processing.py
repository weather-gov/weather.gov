from datetime import datetime

from django.test import TestCase

from backend import util
from backend.models import WFO, HazardousWeatherOutlookLevels, HazardousWeatherOutlookMetadata, Region


class TestGHWOProcessing(TestCase):
    """Test the processing of GHWO data for display in templates."""

    def setUp(self):
        """Set up the test data needed for each test."""
        wfo = WFO.objects.create(code="TST", name="Test", region=Region.objects.create(name="Test"))

        # Default lightning levels. Delete the defaults provided by the
        # migration first.
        HazardousWeatherOutlookLevels.objects.filter(
            type=HazardousWeatherOutlookMetadata.Keys.lightning,
            wfo=None,
        ).delete()
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.lightning,
            wfo=None,
            number=0,
            label="Zip",
            description="There won't be any lightning.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.lightning,
            wfo=None,
            number=1,
            label="A bit",
            description="A few zaps here and there.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.lightning,
            wfo=None,
            number=2,
            label="Some",
            description="When thunder roars, stay indoors.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.lightning,
            wfo=None,
            number=3,
            label="Lots",
            description="Someone has angered the gods!",
        )

        # Default extreme cold
        HazardousWeatherOutlookMetadata.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold, wfo=None, basis="Lips go brr"
        )
        HazardousWeatherOutlookLevels.objects.filter(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
        ).delete()
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=0,
            label="Warm",
            description="It's actually not cold at all.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=1,
            label="Nippy",
            description="Your ears will hurt.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=2,
            label="Cold",
            description="Two pairs of socks.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=3,
            label="Very cold",
            description="The Detroit Lions have appeared in the Super Bowl.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=4,
            label="YIKES",
            description="The Detroit Lions have won the Super Bowl.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=5,
            label="All stop",
            description="Absolute zero achieved.",
        )

        # Now some WFO-specific metadata, to test merging.
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.lightning,
            wfo=wfo,
            number=3,
            label="Ker-pow!",
            description="Big bada boom",
        )

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
                    "risks": {
                        "Lightning": {"category": 1},
                        "SnowSleet": {"category": 0},
                        "FireWeather": {"category": 4},
                        "UnknownRiskType": {"category": 3},
                    },
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
                    "risks": {
                        "FireWeather": {"category": 1},
                        "ExcessiveRainfall": {"category": 0},
                    },
                    "timestamp": "aTimestamp",
                    "composite:": {"max": 5, "scaled": 0.2},
                    "dayNumber": 2,
                },
                {
                    "risks": {
                        "NonConvectiveWind": {"category": 0},
                        "IceAccumulation": {"category": 1},
                    },
                    "timestamp": "aTimestamp",
                    "composite": {"max": 1, "scaled": 0.25},
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

    def test_get_risk_daily_rows(self):
        """
        Test the processing of GHWO data into a structure of rows.

        The output data structure will be one more amenable to
        creating table rows in the template(s).
        """
        data = {
            "wfo": "tst",
            "days": [
                {
                    "risks": {"Lightning": {"category": 3}, "ExtremeCold": {"category": 0}},
                    "dayNumber": 1,
                    "composite": {"max": 3, "scaled": 0.6},
                    "timestamp": "2025-11-04T19:00:00-05:00",
                    "images": {},
                },
                {
                    "risks": {"Lightning": {"category": 2}, "ExtremeCold": {"category": 4}},
                    "dayNumber": 2,
                    "composite": {"max": 4, "scaled": 0.8},
                    "timestamp": "2025-11-05T07:00:00-05:00",
                    "images": {},
                },
                {
                    "risks": {"Lightning": {"category": 0}, "ExtremeCold": {"category": 2}},
                    "dayNumber": 3,
                    "composite": {"max": 2, "scaled": 0.4},
                    "timestamp": "2025-11-06T07:00:00-05:00",
                    "images": {},
                },
            ],
        }

        risk_ids = ["Lightning", "ExtremeCold"]

        processed_data = util._get_risk_daily_rows(risk_ids, data)
        self.assertEqual(len(processed_data), 2)

        # Lightning row
        first_row = processed_data[0]
        self.assertEqual(first_row["risk"]["id"], "Lightning")
        expected_first_row_days = [
            {
                "level": {
                    "label": "Ker-pow!",
                    "number": 3,
                    "description": "Big bada boom",
                },
                "timestamp": "2025-11-04T19:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-04T19:00:00-05:00"),
                "day_number": 1,
                "image": None,
            },
            {
                "level": {
                    "label": "Some",
                    "number": 2,
                    "description": "When thunder roars, stay indoors.",
                },
                "timestamp": "2025-11-05T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-05T07:00:00-05:00"),
                "day_number": 2,
                "image": None,
            },
            {
                "level": {
                    "label": "Zip",
                    "number": 0,
                    "description": "There won't be any lightning.",
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
                    "label": "Warm",
                    "number": 0,
                    "description": "It's actually not cold at all.",
                },
                "timestamp": "2025-11-04T19:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-04T19:00:00-05:00"),
                "day_number": 1,
                "image": None,
            },
            {
                "level": {
                    "label": "YIKES",
                    "number": 4,
                    "description": "The Detroit Lions have won the Super Bowl.",
                },
                "timestamp": "2025-11-05T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-05T07:00:00-05:00"),
                "day_number": 2,
                "image": None,
            },
            {
                "level": {
                    "label": "Cold",
                    "number": 2,
                    "description": "Two pairs of socks.",
                },
                "timestamp": "2025-11-06T07:00:00-05:00",
                "datetime": datetime.fromisoformat("2025-11-06T07:00:00-05:00"),
                "day_number": 3,
                "image": None,
            },
        ]
        self.assertEqual(expected_second_row_days, second_row["days"])

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
                    "risks": {
                        "Lightning": {"category": 3},
                        "SevereThunderstorm": {"category": 1},
                        "Tornado": {"category": 0},
                        "SomeUnknownRisk": {"category": 0},
                    },
                    "dayNumber": 1,
                    "ExtremeCold": 0,
                    "composite": {"max": 3, "scaled": 0.75},
                    "timestamp": "2025-11-04T19:00:00-05:00",
                    "images": {},
                },
                {
                    "risks": {
                        "Lightning": {"category": 2},
                        "ExtremeCold": {"category": 0},
                        "SevereThunderstorm": {"category": 0},
                        "Tornado": {"category": 0},
                        "SomeUnknownRisk": {"category": 0},
                    },
                    "dayNumber": 2,
                    "composite": {"max": 4, "scaled": 0.8},
                    "timestamp": "2025-11-05T07:00:00-05:00",
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
