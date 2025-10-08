from unittest.mock import Mock, patch

from django.contrib.auth import authenticate
from django.http import HttpRequest, QueryDict
from django.test import TestCase, override_settings

from backend.models import NOAAUser
from noaa_saml.utils import prepare_saml_request


@patch("noaa_saml.utils.init_saml_auth")
class TestNOAABackendAuth(TestCase):
    """Test custom authentication backend for NOAA SAML."""

    def setUp(self):
        """Test setup."""
        # Create a dummy user that exists
        self.existing_user = NOAAUser(username="test.user", email="test.user@noaa.gov")
        self.existing_user.save()

    def __prepare_http_request(self):
        req = HttpRequest()
        req.META["HTTP_HOST"] = "beta.weather.gov"
        req.META["PATH_INFO"] = "saml/acs"
        post_data = QueryDict(mutable=True)
        post_data.update(
            {
                "SAMLResponse": "a_valid_saml_response_base64",
            },
        )
        req.POST = post_data
        req.session = {
            "AuthNRequestID": "unique_auth_token_for_response",
        }

        return req

    def test_valid_saml_response_for_existing_user(self, init_saml_auth):
        """A valid SAML response should authenticate the test user."""
        mock_auth = Mock()
        mock_auth.is_authenticated.return_value = True
        mock_auth.get_attributes.return_value = {
            "uid": ["test.user"],
            "mail": ["test.user@noaa.gov"],
        }
        mock_auth.prepare_response.return_value = True
        init_saml_auth.return_value = mock_auth

        request = self.__prepare_http_request()
        saml_request_info = prepare_saml_request(request)
        saml_auth = init_saml_auth(saml_request_info)

        result = authenticate(request, saml_auth=saml_auth)

        self.assertEqual(self.existing_user, result)

    @override_settings(SAML_CREATES_NEW_USERS=True)
    def test_response_creates_new_user_setting_on(self, init_saml_auth):
        """A valid authfor a non-existing user creates the user (setting on)."""
        mock_auth = Mock()
        mock_auth.is_authenticated.return_value = True
        mock_auth.process_response.return_value = None
        mock_auth.get_attributes.return_value = {
            "uid": ["second.user"],
            "mail": ["second.user@noaa.gov"],
        }
        init_saml_auth.return_value = mock_auth

        request = self.__prepare_http_request()
        saml_request_info = prepare_saml_request(request)
        saml_auth = init_saml_auth(saml_request_info)

        # First, assert that the user does not exist
        # in the db currently
        non_existing_user = NOAAUser.objects.filter(username="second.user").first()
        self.assertIsNone(non_existing_user)

        # Now we authenticate the request
        new_user = authenticate(request, saml_auth=saml_auth)
        self.assertIsNotNone(new_user)

    @override_settings(SAML_CREATES_NEW_USERS=False)
    def test_response_creates_new_user_setting_off(self, init_saml_auth):
        """A valid authfor a non-existing user doesn't create the user (setting off)."""
        mock_auth = Mock()
        mock_auth.is_authenticated.return_value = True
        mock_auth.process_response.return_value = None
        mock_auth.get_attributes.return_value = {
            "uid": ["third.user"],
            "mail": ["third.user@noaa.gov"],
        }
        init_saml_auth.return_value = mock_auth

        request = self.__prepare_http_request()
        saml_request_info = prepare_saml_request(request)
        saml_auth = init_saml_auth(saml_request_info)

        # First, assert that the user does not exist
        # in the db currently
        non_existing_user = NOAAUser.objects.filter(username="second.user").first()
        self.assertIsNone(non_existing_user)

        # Now we authenticate the request
        new_user = authenticate(request, saml_auth=saml_auth)
        self.assertIsNone(new_user)

    def test_invalid_saml_response_for_any_user(self, init_saml_auth):
        """An invalid SAML response should _not_ authenticate any user."""
        mock_auth = Mock()
        mock_auth.is_authenticated.return_value = False
        mock_auth.get_attributes.return_value = {
            "uid": ["test.user"],
            "mail": ["test.user@noaa.gov"],
        }
        mock_auth.process_response.return_value = None
        init_saml_auth.return_value = mock_auth

        request = self.__prepare_http_request()
        saml_request_info = prepare_saml_request(request)
        saml_auth = init_saml_auth(saml_request_info)

        result = authenticate(request, saml_auth=saml_auth)

        self.assertEqual(None, result)
