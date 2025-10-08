from django.conf import settings
from django.test import TestCase

from backend.models import NOAAUser


class TestSAMLViews(TestCase):
    """Test our SAML view handlers."""

    def setUp(self):
        """Test setup."""
        self.SSO_REDIRECT_URL = settings.SAML_SETTINGS["idp"]["singleSignOnService"]["url"]
        self.test_user = NOAAUser.objects.create(username="test.user", email="test.user@noaa.gov")
        self.test_user.save()

    def tearDown(self):
        """Test teardown."""
        self.test_user.delete()

    def test_login_redirects_to_sso_endpoint(self):
        """Ensure that the login saml url redirects to the NOAA ICAM IDP endpoint."""
        response = self.client.get("/saml/login/", follow=False)
        redirect_url = response.url.split("?")[0]

        self.assertEqual(redirect_url, self.SSO_REDIRECT_URL)
