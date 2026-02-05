from base64 import b64decode

import environs
from onelogin.saml2.idp_metadata_parser import OneLogin_Saml2_IdPMetadataParser

from .utils import get_saml_meta_expiry, get_vcap_application, get_vcap_services


class SAMLVCAPNotFoundError(Exception):
    """Exception for when VCAP can't be found."""

    def __init__(self):
        super().__init__("SAML Settings could not find VCAP information.")


class SAMLIDPError(Exception):
    """Wrap SAML error responses from the IDP."""

    def __init__(self):
        super().__init__("SAML IDP returned an error.")


env = environs.Env()
cloudgov_space = env("CLOUDGOV_SPACE", "test")
DEBUG = env.bool("DJANGO_DEBUG", False)
ICAM_METADATA_URL = (
    "https://sso.noaa.gov/openam/saml2/jsp/exportmetadata.jsp?entityid=noaa-online-idp&realm=/noaa-online"
)


# Settings for production / cloud_gov environments
def get_cloud_gov_settings():
    """Create a SAML settings dict for use in cloud-gov environments.

    Attempts to pull relevant env vars from
    VCAP
    """
    vcap_application = get_vcap_application()
    vcap_services = get_vcap_services()

    if not vcap_application or not vcap_services:
        raise SAMLVCAPNotFoundError()

    user_provided = vcap_services["user-provided"]
    # find the appropriate credential service from cloud.gov, since there might
    # be other services (such as logshipper).
    service = next(service for service in user_provided if service["name"].endswith("credentials"))
    sp_private_key = service["credentials"]["sp_private_key"]
    entity_id = f"https://{vcap_application['application_uris'][0]}"

    # Fetch IDP information from the NOAA metadata route
    # This will create an appropriately formatted dict for SAML Toolkit settings
    # that has the IDP part of the settings populated
    result = OneLogin_Saml2_IdPMetadataParser.parse_remote(ICAM_METADATA_URL)
    result["strict"] = True
    result["debug"] = False

    # Now we add the SP specific settings:
    sp_settings = {
        "privateKey": b64decode(sp_private_key).decode("utf8"),
        "x509cert": result["idp"]["x509cert"],
        "entityId": entity_id,
        "assertionConsumerService": {
            # Do _not_ include the trailing slash in this url
            # The metadata registered with ICAM does not include the slash,
            # and if present it will cause a mismatch and fail
            "url": f"{entity_id}/saml/acs",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        },
        "singleLogoutService": {
            "url": f"{entity_id}/saml/sls",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
        },
        "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    }
    result["sp"] = sp_settings
    result["security"] = {
        "authnRequestsSigned": True,
        "logoutRequestSigned": True,
        "logoutResponseSigned": True,
        "signMetadata": True,
        "wantNameId": True,  # might already be the default
        "wantAssertionsSigned": True,
        "requestedAuthnContextComparison": "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport",
        "metadataValidUntil": get_saml_meta_expiry(),
    }

    return result


# Local development SAML settings
# -----------------------------
# For the moment, these are dummy settings that should
# not affect anything in the app, so long as you do not try
# to log into the admin or wagtail interfaces.
#
# In the future, we might have a need to set up a dev environment
# authentication backend and skips much of the SAML checking but
# still integrates it into the system, in order to live test
# the CMS

DEV = {
    "strict": True,
    "debug": True,
    "idp": {
        "entityId": "http://fake-idp.beta.weather.gov/saml/metadata",
        "singleSignOnService": {
            "url": "http://fake-idp.beta.weather.gov/saml/sso",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
        },
        "singleLogoutService": {
            "url": "http://fake-idp.beta.weather.gov/saml/slo/",
            "responseUrl": "http://fake-idp.beta.weather.gov/saml/slo_return/",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
        },
        # This is a base64 encoded string version of the certificate
        # found at noaa_saml/tests/certs/test_certificate.crt
        "x509cert": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNZRENDQWNtZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREJOTVFzd0NRWURWUVFHRXdKMWN6RVIKTUE4R0ExVUVDQXdJVG1WM0lGbHZjbXN4RERBS0JnTlZCQW9NQTA1WFV6RWRNQnNHQTFVRUF3d1VaR1YyTG1KbApkR0V1ZDJWaGRHaGxjaTVuYjNZd0hoY05NalV4TURBek1UZzBNRE0xV2hjTk1qWXhNREF6TVRnME1ETTFXakJOCk1Rc3dDUVlEVlFRR0V3SjFjekVSTUE4R0ExVUVDQXdJVG1WM0lGbHZjbXN4RERBS0JnTlZCQW9NQTA1WFV6RWQKTUJzR0ExVUVBd3dVWkdWMkxtSmxkR0V1ZDJWaGRHaGxjaTVuYjNZd2daOHdEUVlKS29aSWh2Y05BUUVCQlFBRApnWTBBTUlHSkFvR0JBT2NDakVCWFV1QWlDU3hseURoalRrT1M0UnltdGZ2MWdDVXNZRXZxN2ExNDRCVUhkRlMvClJyT2F1VkJ6MUdTUlk4R25vV21VeTVVOEV4T2Q1cXBZYXRsRHp1SWtXUzhCNHplRllIZWY3a1dsMnU3WHp6SDUKSkcvdXZkWjE4QTZhTC8xcmY1U1pmL0RSaW43QWREZThlVFBVa3RPRlplWEhzbUJ2MUwySXh2YXRBZ01CQUFHagpVREJPTUIwR0ExVWREZ1FXQkJTOHpySlhyVS9mOTlZSUhYSUV1NDNrb1pza2FEQWZCZ05WSFNNRUdEQVdnQlM4CnpySlhyVS9mOTlZSUhYSUV1NDNrb1pza2FEQU1CZ05WSFJNRUJUQURBUUgvTUEwR0NTcUdTSWIzRFFFQkN3VUEKQTRHQkFNN3FYblZFMHh5Zy9SNWJEdXZROG4rMkJRZnBQMXNSY0ZUdWJmeFFmNmpwWCtMclI5NXJKd2xSMXErUQpBV010MFRaWWh0RG9aczF4RFVMRmIyeDFuekwxaTY0N0ZEazQ4VEVadGF0dVhDTEs5UVVCOXo1dHBrNFB6QzNrCmFmRW1ZdjBwZzVmUHRGN1ZnZ0QyRFJHaXVPNjh1NElmcXZSUHJqUzRBZ3FtUENIYQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t",  # noqa: E501
    },
    "sp": {
        "entityId": "http://localhost:8080/saml/metadata/",
        "assertionConsumerService": {
            "url": "http://localhost:8080/saml/acs",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        },
        "singleLogoutService": {
            "url": "http://localhost:8080/saml/sls",
            "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
        },
        "NameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
        # Certificate is the same as used by the IDP above
        "x509cert": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNZRENDQWNtZ0F3SUJBZ0lCQURBTkJna3Foa2lHOXcwQkFRc0ZBREJOTVFzd0NRWURWUVFHRXdKMWN6RVIKTUE4R0ExVUVDQXdJVG1WM0lGbHZjbXN4RERBS0JnTlZCQW9NQTA1WFV6RWRNQnNHQTFVRUF3d1VaR1YyTG1KbApkR0V1ZDJWaGRHaGxjaTVuYjNZd0hoY05NalV4TURBek1UZzBNRE0xV2hjTk1qWXhNREF6TVRnME1ETTFXakJOCk1Rc3dDUVlEVlFRR0V3SjFjekVSTUE4R0ExVUVDQXdJVG1WM0lGbHZjbXN4RERBS0JnTlZCQW9NQTA1WFV6RWQKTUJzR0ExVUVBd3dVWkdWMkxtSmxkR0V1ZDJWaGRHaGxjaTVuYjNZd2daOHdEUVlKS29aSWh2Y05BUUVCQlFBRApnWTBBTUlHSkFvR0JBT2NDakVCWFV1QWlDU3hseURoalRrT1M0UnltdGZ2MWdDVXNZRXZxN2ExNDRCVUhkRlMvClJyT2F1VkJ6MUdTUlk4R25vV21VeTVVOEV4T2Q1cXBZYXRsRHp1SWtXUzhCNHplRllIZWY3a1dsMnU3WHp6SDUKSkcvdXZkWjE4QTZhTC8xcmY1U1pmL0RSaW43QWREZThlVFBVa3RPRlplWEhzbUJ2MUwySXh2YXRBZ01CQUFHagpVREJPTUIwR0ExVWREZ1FXQkJTOHpySlhyVS9mOTlZSUhYSUV1NDNrb1pza2FEQWZCZ05WSFNNRUdEQVdnQlM4CnpySlhyVS9mOTlZSUhYSUV1NDNrb1pza2FEQU1CZ05WSFJNRUJUQURBUUgvTUEwR0NTcUdTSWIzRFFFQkN3VUEKQTRHQkFNN3FYblZFMHh5Zy9SNWJEdXZROG4rMkJRZnBQMXNSY0ZUdWJmeFFmNmpwWCtMclI5NXJKd2xSMXErUQpBV010MFRaWWh0RG9aczF4RFVMRmIyeDFuekwxaTY0N0ZEazQ4VEVadGF0dVhDTEs5UVVCOXo1dHBrNFB6QzNrCmFmRW1ZdjBwZzVmUHRGN1ZnZ0QyRFJHaXVPNjh1NElmcXZSUHJqUzRBZ3FtUENIYQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t",  # noqa: E501
        # Private key for signing is a base64 encoded version of
        # the key located at noaa_saml/test/certs/test_private.pem
        "privateKey": "LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUNlQUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQW1Jd2dnSmVBZ0VBQW9HQkFPY0NqRUJYVXVBaUNTeGwKeURoalRrT1M0UnltdGZ2MWdDVXNZRXZxN2ExNDRCVUhkRlMvUnJPYXVWQnoxR1NSWThHbm9XbVV5NVU4RXhPZAo1cXBZYXRsRHp1SWtXUzhCNHplRllIZWY3a1dsMnU3WHp6SDVKRy91dmRaMThBNmFMLzFyZjVTWmYvRFJpbjdBCmREZThlVFBVa3RPRlplWEhzbUJ2MUwySXh2YXRBZ01CQUFFQ2dZRUFtUVBWQnFGUTRlbHBqaUQxR0hTZTJKK24Kd0tTa2tub3hJVzVkY3F2d055R0R2Q290NGh5NHBpcnNhTi93WlpUd01NdnFYTmNVYW90YVQzb2QyZU9yRVhCTgp4MDd3c1g4QXZmSkdjd00rYVBVRkRNdVZnNXpPUkNRN1BJUEtWdldZWTZyVHpOM21VeElRRWpTL2dVOFdNRnVpCkR2djFDQi9FMlRYNEdOTTJJL2tDUVFENmFlOC9PMVdmVFR3T3BGdWYwSzhPdjYxTkM0Vm1LQWFWamtvMjAxS2cKNXhTbk5VWncxa1JDV1JYR2tIVHNlYk9uUS9jRXFXZFp4SHFkc1Q2QlJGdERBa0VBN0NuTk5ROVExSGpxUE9GZgpXVlVzczlONXhrb1oyVFlVeEZlMEtqZ1gxM1pEZFp5M0pNTjVpTE1FdDhoNjNNbEkyWmFPZTJlejNac1lMYm9uCm1jU3ZUd0pCQUlabTYwRXQ4SVBDNlhRV1pSTCs1NlpyM0hFWXVPMmVtQUlYVDkvalJsc1VDL0srMW1ManJkbEsKaFRTQS9qQ2FGWUcyS2RPM3RML3FnOEUxaTQzSUNZOENRUUNnMUFyYXdwWmlUQUlBK2Q1c1FOUVRsc1lNWXJSZAp0elhIVEk3MlhZTG5DYlFCS1h1VHZzZEtiOWViclJ6MnRPRTJ4UkE5UEM5Q2tIZVQxSDFaZTVlREFrQTFTWTRYCjdlUWV4eXdzN2VmTUJRSVloNWdYMlRUUXZpOFZKdXg4NU5GZmRGcDNpQnIrNGkra0JMNDZRWHhNam9jeFcrSnAKR3NzUG1QZXJEbkFwU3RWLwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0t",  # noqa: E501
        "security": {
            "authnRequestsSigned": False,
            "logoutRequestSigned": False,
            "logoutResponseSigned": False,
            "signMetadata": False,
            "wantNameId": True,  # might already be the default
            "wantAssertionsSigned": False,
            "requestedAuthnContextComparison": "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport",
            "metadataValidUntil": get_saml_meta_expiry(),
        },
    },
}
