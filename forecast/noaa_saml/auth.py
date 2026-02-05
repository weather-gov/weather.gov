from django.conf import settings
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import Group

from backend.models import NOAAUser


class NOAABackend(BaseBackend):
    """Custom authentication backend for NOAA SAML."""

    def authenticate(self, request, **credentials):
        """
        Use custom authentication for incoming SAML requests.

        We assume that this method is passed a named param
        called saml_auth which is a configured SAML Toolkit
        authentication object.
        See init_saml_auth for more information
        """
        if "saml_auth" not in credentials:
            return None
        saml_auth = credentials["saml_auth"]

        # Pull out a request_id if there is one present
        # in the request session
        if "AuthNRequestID" in request.session:
            request_id = request.session["AuthNRequestID"]
        else:
            request_id = None

        saml_auth.process_response(request_id=request_id)

        # The IDP responded that the user
        # is not authenticated
        if not saml_auth.is_authenticated():
            return None

        # In our case, NOAA ICAM
        attributes = saml_auth.get_attributes()
        if "uid" not in attributes:
            return None

        # If a user is authenticated but does not exist in the
        # system yet, we use the settigns to determine if
        # we should automatically create a new user based
        # on the incoming SAML information
        try:
            user = NOAAUser.objects.get(username=attributes["uid"][0])
        except NOAAUser.DoesNotExist:
            return self.handle_user_does_not_exist(attributes)

        return user

    def get_user(self, user_id):
        """Django authenticate getter."""
        try:
            return NOAAUser.objects.get(id=user_id)
        except NOAAUser.DoesNotExist:
            return None

    def handle_user_does_not_exist(self, saml_attributes):
        """Handle case where the user doesn't exist yet.

        In cases where a user is authenticated, but does
        not already exist in the system, we might want to
        create a new user with the passed-in SAML information.

        We use the django setting SAML_CREATES_NEW_USERS
        to determine if we should to this or not
        """
        if hasattr(settings, "SAML_CREATES_NEW_USERS"):
            if settings.SAML_CREATES_NEW_USERS:
                # The SAML toolkit parses authenticated SAML attribute
                # data into a list for each data type.
                # In this case, we get `uid` and `mail`, and each
                # should be a list of size 1
                new_user = NOAAUser.objects.create(username=saml_attributes["uid"][0], email=saml_attributes["mail"][0])
                new_user.is_staff = True
                editors_group = Group.objects.get(name="Editors")
                new_user.groups.add(editors_group)
                new_user.save()
                return new_user

        return None
