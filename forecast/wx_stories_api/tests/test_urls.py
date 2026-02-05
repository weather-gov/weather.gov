from django.test import TestCase
from django.urls import resolve, reverse

from wx_stories_api import views


class TestUrls(TestCase):
    """Test URL patterns."""

    def test_pdf_upload(self):
        """Test /jsonapi/node/wfo_pdf_upload/field_wfo_sitrep."""
        resolver = resolve("/jsonapi/node/wfo_pdf_upload/field_wfo_sitrep")
        back = reverse("pdf-upload")
        self.assertEquals(resolver.func, views.pdf)
        self.assertEquals(back, "/jsonapi/node/wfo_pdf_upload/field_wfo_sitrep")

    def test_create_daily_situation_report(self):
        """Test /jsonapi/node/wfo_pdf_upload."""
        resolver = resolve("/jsonapi/node/wfo_pdf_upload")
        back = reverse("create-daily-situation-report")
        self.assertEquals(resolver.func, views.situation_report)
        self.assertEquals(back, "/jsonapi/node/wfo_pdf_upload")

    def test_image_upload(self):
        """Test /jsonapi/node/wfo_weather_story_upload/field_fullimage."""
        resolver = resolve("/jsonapi/node/wfo_weather_story_upload/field_fullimage")
        back = reverse("image-upload", kwargs={"size": "F"})
        self.assertEquals(resolver.func, views.image)
        self.assertEquals(resolver.kwargs, {"size": "F"})
        self.assertEquals(back, "/jsonapi/node/wfo_weather_story_upload/field_fullimage")

    def test_image_upload_small(self):
        """Test /jsonapi/node/wfo_weather_story_upload/field_smallimage."""
        resolver = resolve("/jsonapi/node/wfo_weather_story_upload/field_smallimage")
        back = reverse("image-upload-small", kwargs={"size": "S"})
        self.assertEquals(resolver.func, views.image)
        self.assertEquals(resolver.kwargs, {"size": "S"})
        self.assertEquals(back, "/jsonapi/node/wfo_weather_story_upload/field_smallimage")

    def test_create_weather_story(self):
        """Test /jsonapi/node/wfo_weather_story_upload."""
        resolver = resolve("/jsonapi/node/wfo_weather_story_upload")
        back = reverse("create-weather-story")
        self.assertEquals(resolver.func, views.weather_story)
        self.assertEquals(back, "/jsonapi/node/wfo_weather_story_upload")
