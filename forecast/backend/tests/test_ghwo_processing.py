from django.test import TestCase

from backend import util


class TestGHWOProcessing(TestCase):
    """Test the processing of GHWO data for display in templates."""

    def test_get_ghwo_daily_images(self):
        """
        Test getting a set of the images from all days.

        We expect to only retrieve unique image
        urls across days for risk factors greater
        than 0.
        """
        data = {
            "risks": {
                "Lightning": {
                    "days": [{"image": "lightning_url", "category": 1, "timestamp": "aTimestamp"}],
                },
                "SnowSleet": {
                    "days": [{"image": "snowsleet_url", "category": 0, "timestamp": "aTimestamp"}],
                },
                "FireWeather": {
                    "days": [{"image": "fireweather_url", "category": 4, "timestamp": "aTimestamp"}],
                },
                "UnknownRiskType": {
                    "days": [{"category": 3, "timestamp": "aTimestamp"}],
                },
            },
        }

        urls = util.get_ghwo_daily_images(data)

        self.assertIn("lightning_url", urls)
        self.assertIn("fireweather_url", urls)
        self.assertNotIn("snowsleet_url", urls)
        self.assertEqual(len(urls), 2)
