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

    def test_set_title_for_every_point_tab(self):
        """Test each point tab route has a translated title."""
        for url_name in [
            "point_forecast_alerts",
            "point_forecast_today",
            "point_forecast_seven_day",
            "point_forecast_maps",
            "point_forecast_analysis",
        ]:
            with self.subTest(url_name=url_name):
                context = {
                    "title_trans_args": {"fullName": "Location, ST"},
                    "request": SimpleNamespace(resolver_match=SimpleNamespace(url_name=url_name)),
                }
                actual = weather_title.set_title_and_description(context)
                self.assertIn("<title>Location, ST Forecast | This Agency</title>", actual)

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

    def test_set_title_with_meta_error(self):
        """Test that error pages with meta error set has a translated title."""
        for meta_error in [("error_404", "404"), ("error_500", "500")]:
            with self.subTest(meta_error=meta_error):
                context = {"meta_error": meta_error[0]}
                actual = weather_title.set_title_and_description(context)
                self.assertIn(f"<title>{meta_error[1]} | This Agency</title>", actual)

    def test_set_title_for_deprecated_paths(self):
        """Test that error pages for deprecated paths have translated titles."""
        for meta_error in [
            ("deprecated_office", {"wfo": "XYZ"}, "404"),
            ("deprecated_point", {}, "404"),
            ("deprecated_county_pages", {}, "404"),
            ("deprecated_place", {}, "404"),
        ]:
            with self.subTest(meta_error=meta_error):
                context = {"meta_error": meta_error[0]}
                actual = weather_title.set_title_and_description(context)
                self.assertIn(f"<title>{meta_error[2]} | This Agency</title>", actual)
