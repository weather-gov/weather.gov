from django.test import TestCase


class SitePageTests(TestCase):
    """Ensure that we can load the base site pages."""

    def test_about_ok(self):
        """We can load the about page."""
        response = self.client.get("/about/")
        self.assertEqual(response.status_code, 200)

    def test_disclaimer_ok(self):
        """We can load the disclaimer page."""
        response = self.client.get("/disclaimer/")
        self.assertEqual(response.status_code, 200)

    def test_accessibility_ok(self):
        """We can load the accessibility page."""
        response = self.client.get("/accessibility/")
        self.assertEqual(response.status_code, 200)

    def test_privacy_ok(self):
        """We can load the privacy page."""
        response = self.client.get("/privacy/")
        self.assertEqual(response.status_code, 200)
