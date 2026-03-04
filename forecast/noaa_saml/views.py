import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseServerError
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from onelogin.saml2.settings import OneLogin_Saml2_Settings
from onelogin.saml2.utils import OneLogin_Saml2_Utils

from noaa_saml.config import SAMLIDPError
from noaa_saml.utils import (
    get_saml_info_from_session,
    init_saml_auth,
    prepare_saml_request,
    update_session_with_saml_info,
)


# this view used to be available via `saml/metadata` but we are disabling it
# because it never quite worked as intended. python3-saml expects a ISO
# timestamp with 'Z' but we get an UTC offset instead. if the IDP ever hits this
# endpoint, though, we will need to re-enable and fix.
def saml_metadata(_request):
    """Respond with SAML SP metadata XML."""
    saml_settings = OneLogin_Saml2_Settings(settings=settings.SAML_SETTINGS, sp_validation_only=True)
    metadata = saml_settings.get_sp_metadata()
    errors = saml_settings.validate_metadata(metadata)

    if len(errors) == 0:
        return HttpResponse(content=metadata, content_type="text/xml")

    return HttpResponseServerError(content=", ".join(errors))


def saml_login(request):
    """
    Send a login request to the IDP with valid parameters.

    If configured correctly, users will be redirected to the IDPs
    remote authentication flow
    """
    saml_request_info = prepare_saml_request(request)
    auth = init_saml_auth(saml_request_info)

    # AuthNRequest ID needs to be stored in order to later validate it
    return_to = OneLogin_Saml2_Utils.get_self_url(saml_request_info) + "/cms/"
    sso_built_url = auth.login(return_to)

    # If the user is already authenticated, redirect to the
    # admin page for wagtail
    if request.user.is_authenticated:
        return HttpResponseRedirect(return_to)

    # Otherwise, set the request session token and send a request
    # to the IDP
    request.session["AuthNRequestID"] = auth.get_last_request_id()

    return HttpResponseRedirect(sso_built_url)


def saml_logout(request):
    """Send a logout request to the IDP with valid parameters."""
    saml_request_info = prepare_saml_request(request)
    auth = init_saml_auth(saml_request_info)
    logout_params = get_saml_info_from_session(request.session)
    slo_built_url = auth.logout(**logout_params)
    request.session["LogoutRequestID"] = auth.get_last_request_id()
    return HttpResponseRedirect(slo_built_url)


@csrf_exempt
@require_POST
def saml_acs(request):
    """
    SAML Assertion Consumer Service (ACS) endpoint.

    The IDP will POST to this endpoint once a response
    from a login request is processed.
    It handles checking the response for validity and errors.
    If invalid or other errors are present, it will
    raise a SAMLIDPError.
    If successful, this handler will authenticate and log in
    the specified user (setting session vars as needed)
    """
    saml_request_info = prepare_saml_request(request)
    auth = init_saml_auth(saml_request_info)

    request_id = None
    attributes = False
    if "AuthNRequestID" in request.session:
        request_id = request.session["AuthNRequestID"]
    auth.process_response(request_id=request_id)
    update_session_with_saml_info(request.session, auth)
    errors = auth.get_errors()
    error_reason = None
    not_saml_auth_warn = not auth.is_authenticated()

    # We want to determine that the RelayState
    # (where we will redirect to) is valid
    relay_valid = (
        "RelayState" in saml_request_info["post_data"]
        and OneLogin_Saml2_Utils.get_self_url(saml_request_info) != saml_request_info["post_data"]["RelayState"]
    )

    # Now we authenticate using the NOAABackend
    # authentication backend. If successful, calling
    # authenticate will return a User object.
    user = authenticate(request, saml_auth=auth)
    if errors or not user or not relay_valid:
        logger = logging.getLogger(__name__)
        logger.error(f"SAML login error: {error_reason}")
        logger.error(f"SAML backtrace: errors: {errors}")
        logger.error(f"SAML backtrace: attributes: {attributes}")
        logger.error(f"SAML backtrace: not_saml_auth_warn: {not_saml_auth_warn}")
        raise SAMLIDPError()

    # Otherwise, login the user in a Django session
    # and redirect to the RelayState page, which here
    # will be the CMS admin page
    login(request, user)
    return HttpResponseRedirect(auth.redirect_to(saml_request_info["post_data"]["RelayState"]))


@csrf_exempt
def saml_sls(request):
    """
    SAML Single Logout Service (SLS) endpoint.

    This endpoint is hit by the IDP when confirming or rejecting
    a logout request.
    If the request is valid, will logout the specified user
    from Django.
    If not, will raise a SAMLIDPError.
    """
    saml_request_info = prepare_saml_request(request)
    auth = init_saml_auth(saml_request_info)

    request_id = None
    errors = []
    error_reason = False
    attributes = None

    if "LogoutRequestID" in request.session:
        request_id = request.session["LogoutRequestID"]
    # we ignore the return url as to avoid open redirect attacks.
    _ = auth.process_slo(request_id=request_id, delete_session_cb=request.session.flush)
    errors = auth.get_errors()
    if len(errors) == 0:
        # Log the current session's user out of Django
        logout(request)
        return HttpResponseRedirect("/")

    if auth.get_settings().is_debug_active():
        error_reason = auth.get_last_error_reason()

    if "samlUserdata" in request.session:
        if len(request.session["samlUserdata"]) > 0:
            attributes = request.session["samlUserdata"].items()

    logger = logging.getLogger(__name__)
    logger.error(f"SAML logout error: {error_reason}")
    logger.error(f"SAML backtrace: errors: {errors}")
    logger.error(f"SAML backtrace: attributes: {attributes}")
    raise SAMLIDPError()
