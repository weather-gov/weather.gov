from django.test import TestCase, RequestFactory
from unittest.mock import patch
from backend.views.point import point_forecast_partial

class ReproIssueTest(TestCase):
    @patch('backend.interop.get_point_forecast')
    def test_repro(self, mock_get_point_forecast):
        # Mock the return value of get_point_forecast to return a valid dictionary
        # with 'error' key to trigger the error path in template, or valid data.
        # The template uses 'forecast.error'.
        
        # Scenario 1: forecast has error
        # mock_get_point_forecast.return_value = {
        #     "forecast": {
        #         "error": True, 
        #         "message": "Something went wrong"
        #     }
        # }
        
        # Scenario 2: trigger the else block where sub-templates are included
        mock_get_point_forecast.return_value = {
            "forecast": {
                "days": [
                    {
                        "items": [], 
                        "qpf": [{"liquid": {"in": 0}, "snow": {"in": 0}, "ice": {"in": 0}}],
                        "periods": [],
                        "high": 10,
                        "low": 0,
                        "pop": 0,
                        "alerts": {"metadata": {"count": 0}, "items": []},
                        "hours": [{"time": "2023-01-01T00:00:00", "temperature": {"degF": 10}}],
                        "hourly": {
                            "times": [],
                            "temps": [],
                            "feelsLike": [],
                            "pops": [],
                            "dewpoints": [],
                            "relativeHumidity": [],
                            "windSpeeds": [],
                            "windGusts": [],
                            "windDirections": []
                        },
                        "id": "day1",
                        "itemId": "day1"
                    }
                ]
            }
        }
        
        factory = RequestFactory()
        request = factory.get('/point/37.487/-122.227/partial/forecast')
        
        # This should trigger rendering of async_forecast_response.html -> today-summary-forecast.html
        # which is missing {% load weather_i18n %}
        try:
            response = point_forecast_partial(request, 37.487, -122.227)
            # Inspect content to ensure it rendered
            self.assertEqual(response.status_code, 200)
        except Exception as e:
            print(f"Caught exception: {e}")
            raise e
