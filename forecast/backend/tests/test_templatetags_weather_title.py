from types import SimpleNamespace

from django.test import TestCase, override_settings

from backend.models import GenericPage
from backend.templatetags import weather_title


@override_settings(AGENCY_NAME="This Agency")
class TestTemplateTagWeatherTitle(TestCase):
    """Test template tag for generating title, meta title, and description."""

    def test_set_title_with_point_forecast_place_name(self):
        """Test with point forecast page."""
        context = {
            "title_trans_args": {"fullName": "Location, ST"},
            "request": SimpleNamespace(resolver_match=SimpleNamespace(url_name="point")),
        }
        actual = weather_title.set_title_and_description(context)
        expected = (
            "\n        <title>Location, ST Forecast | This Agency</title>"
            '\n        <meta name="title" content="Location, ST Forecast | This Agency" />'
            '\n        <meta name="description" content="Location, ST Forecast" />'
            "\n        "
        )
        self.assertEqual(actual, expected)

    def test_set_title_with_cms_page_name_and_seo_title(self):
        """Test with CMS authored page."""
        # Use a CMS GenericPage object here, to ensure that the code
        # works properly with both objects and dicts.
        page = GenericPage(title="This page", seo_title="A nice page", meta_description="About this nice page")

        actual = weather_title.set_title_and_description({"page": page})
        expected = (
            "\n        <title>This page | This Agency</title>"
            '\n        <meta name="title" content="A nice page" />'
            '\n        <meta name="description" content="About this nice page" />'
            "\n        "
        )
        self.assertEqual(actual, expected)
