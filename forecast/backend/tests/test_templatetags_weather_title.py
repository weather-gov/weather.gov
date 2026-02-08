from django.test import TestCase, override_settings

from backend.models import GenericPage
from backend.templatetags import weather_title


@override_settings(SITE_NAME="This Site")
@override_settings(AGENCY_NAME="This Agency")
class TestTemplateTagWeatherTitle(TestCase):
    """Test template tag for generating title, meta title, and description."""

    def test_set_title_with_point_forecast_place_name(self):
        """Test with point forecast page."""
        actual = weather_title.set_title_and_description({"point": {"place": {"fullName": "Location, ST"}}})
        expected = (
            "\n        <title>Location, ST | This Agency</title>"
            '\n        <meta name="title" content="Location, ST | This Agency" />'
            '\n        <meta name="description" content="" />'
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

    def test_set_search_description(self):
        """Test with CMS authored page using search description."""
        actual = weather_title.set_title_and_description(
            {
                "page": {
                    "title": "This page",
                    "seo_title": "A nice page",
                    "search_description": "Looking for this nice page",
                }
            }
        )
        expected = (
            "\n        <title>This page | This Agency</title>"
            '\n        <meta name="title" content="A nice page" />'
            '\n        <meta name="description" content="Looking for this nice page" />'
            "\n        "
        )
        self.assertEqual(actual, expected)

    @override_settings(AGENCY_NAME=None)
    def test_set_title_with_default_site_name(self):
        """Test with default site name and with no agency name set."""
        actual = weather_title.set_title_and_description({})
        expected = (
            "\n        <title>This Site</title>"
            '\n        <meta name="title" content="This Site" />'
            '\n        <meta name="description" content="" />'
            "\n        "
        )
        self.assertEqual(actual, expected)
