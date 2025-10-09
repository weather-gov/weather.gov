import datetime
import json
import os
import sys

from django.conf import settings
from onelogin.saml2.auth import OneLogin_Saml2_Auth


# Utility functions for initializing SAML settings
def get_vcap_application():
    """Get a dictionary of the VCAP app variables or None."""
    if "VCAP_APPLICATION" in os.environ:
        return json.loads(os.environ["VCAP_APPLICATION"])
    return None


def get_vcap_services():
    """Get a dictionary of the VCAP services or None."""
    if "VCAP_SERVICES" in os.environ:
        return json.loads(os.environ["VCAP_SERVICES"])
    return None


def get_saml_meta_expiry():
    """Return an ISO timestamp for 1 minute from 'now'.

    to be used by the SAML settings for metadata expiration
    """
    # Python changed how you set timezones in the now method
    # between version 3.10 and 3.11
    # We use a mix across our environments currently
    if sys.version_info[1] < 11:  # noqa: PLR2004
        now = datetime.datetime.now(tz=datetime.timezone.utc)
    else:
        now = datetime.datetime.now(tz=datetime.UTC)
    expires = now + datetime.timedelta(minutes=1)
    return expires.replace(microsecond=0).isoformat()


# Utility functions composed based on the example
# Django project in the SAML Python3 Toolkit


def init_saml_auth(req):
    """Return a configured SAML authentication object.

    These objects are configured from both the SAML settings
    and a properly formatted SAML request object.
    See prepare_saml_request for more information on the latter
    """
    return OneLogin_Saml2_Auth(req, old_settings=settings.SAML_SETTINGS)


def prepare_saml_request(request):
    """Return a dictionary of SAML information taken from an HttpRequest.

    The dictionary produced is in the format SAML Python3 Toolkit
    uses to create SAML authentication objects.
    """
    # If server is behind proxys or balancers use the HTTP_X_FORWARDED fields
    return {
        "https": "on" if request.is_secure() else "off",
        "http_host": request.META.get("HTTP_HOST", ""),
        "script_name": request.META["PATH_INFO"],
        "get_data": request.GET.copy(),
        # Uncomment if using ADFS as IdP, https://github.com/onelogin/python-saml/pull/144
        # 'lowercase_urlencoding': True,
        "post_data": request.POST.copy(),
    }


def update_session_with_saml_info(session, saml_auth):
    """
    Update a given http session object so that it contains relevant information from a valid SAML login.

    These values will be used later to log out
    the session with the IDP
    """
    session["samlUserdata"] = saml_auth.get_attributes()
    session["samlNameId"] = saml_auth.get_nameid()
    session["samlNameIdFormat"] = saml_auth.get_nameid_format()
    session["samlNameIdNameQualifier"] = saml_auth.get_nameid_nq()
    session["samlNameIdSPNameQualifier"] = saml_auth.get_nameid_spnq()
    session["samlSessionIndex"] = saml_auth.get_session_index()


def get_saml_info_from_session(session):
    """
    Return a dict of SAML information.

    This session information can be used for sending logout requests.
    """
    result = {}
    if "samlNameId" in session:
        result["name_id"] = session["samlNameId"]
    if "samlSessionIndex" in session:
        result["session_index"] = session["samlSessionIndex"]
    if "samlNameIdFormat" in session:
        result["name_id_format"] = session["samlNameIdFormat"]
    if "samlNameIdNameQualifier" in session:
        result["nq"] = session["samlNameIdNameQualifier"]
    if "samlNameIdSPNameQualifier" in session:
        result["spnq"] = session["samlNameIdSPNameQualifier"]

    return result
