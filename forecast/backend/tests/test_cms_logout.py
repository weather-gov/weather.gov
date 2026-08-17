from django.test import TestCase, override_settings


class TestCmsLogout(TestCase):
    """Tests the custom CMS logout view."""

    @override_settings(SAML_LOCAL_DEV=True)
    def test_local_dev_logout_redirects_to_cms_login(self):
        """When SAML_LOCAL_DEV is True, logout should redirect to /cms/login/."""
        response = self.client.post("/cms/logout/")
        self.assertRedirects(response, "/cms/login/", fetch_redirect_response=False)

    @override_settings(SAML_LOCAL_DEV=False)
    def test_production_logout_redirects_to_saml_logout(self):
        """When SAML_LOCAL_DEV is False, logout should redirect to /saml/logout/."""
        response = self.client.post("/cms/logout/")
        self.assertRedirects(response, "/saml/logout/", fetch_redirect_response=False)
