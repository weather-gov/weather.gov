from unittest import mock

from django.test import TestCase
from django.urls import reverse


class TestLocationSearchViews(TestCase):
    """Tests our location search based views."""

    @mock.patch("backend.views.location_search.get_list_or_404")
    def test_by_county_successful(self, mock_get_list):
        """Ensure we redirect to the county fips, if successful."""
        mock_county_object = mock.MagicMock()
        type(mock_county_object).countyfips = mock.PropertyMock(return_value="11111")
        mock_get_list.return_value = [
            mock_county_object
        ]

        url = reverse(
            "location_search_by_county",
            kwargs={
                "lat": 50,
                "lon": 50
            }
        )
        response = self.client.get(url)

        self.assertRedirects(
            response,
            reverse(
                "county_overview",
                kwargs={"countyfips": "11111"}
            ),
            fetch_redirect_response=False
        )


    @mock.patch("backend.views.location_search.WeatherCounties.objects.filter")
    def test_by_county_not_found(self, mock_objects_filter):
        """Ensure that empty county queries trigger a 404 response."""
        mock_queryset = mock.MagicMock()
        mock_objects_filter.return_value = mock_queryset
        mock_queryset.first.return_value = None

        url = reverse(
            "location_search_by_county",
            kwargs={
                "lat": 50,
                "lon": 50
            }
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            404
        )
