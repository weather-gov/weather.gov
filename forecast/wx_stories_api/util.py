import base64
import uuid
from email.message import Message
from functools import wraps

from django.contrib.auth import authenticate
from django.http import HttpResponseForbidden

from backend.models import WFO


def basic_auth_required(user=None):
    """Decorate views which require a valid user passed via basic auth."""

    def decorator(view_func):
        """Wrap the decorator function."""

        def _view_wrapper(request, *args, **kwargs):  # noqa: PLR0911
            """Perform decoding and valdiation of the Authorization header."""
            auth = request.META.get("HTTP_AUTHORIZATION", "")
            if not auth:
                return HttpResponseForbidden("The authorization header seems to be missing.")
            if not auth.startswith("Basic "):
                return HttpResponseForbidden("The authorization header must be of type 'Basic'.")

            parts = auth.split(" ")
            if len(parts) != 2:  # noqa: PLR2004
                return HttpResponseForbidden("The authorization header is malformed.")

            user_pass = parts[1]
            try:
                username, password = base64.b64decode(user_pass).decode("utf-8").split(":", 1)
            except (base64.binascii.Error, ValueError):
                return HttpResponseForbidden("The authorization header couldn't be decoded.")
            if not (len(username) and len(password)):
                return HttpResponseForbidden("The authorization header doesn't seem to contain a username or password.")

            if user is not None and username != user:
                return HttpResponseForbidden("The wrong username was given.")

            is_real_user = authenticate(username=username, password=password)
            if not is_real_user:
                return HttpResponseForbidden("The username or password was incorrect.")

            return view_func(request, *args, **kwargs)

        return wraps(view_func)(_view_wrapper)

    return decorator


def get_short_wfo_code(code: str):
    """Match a 4+ letter WFO code to its cannonical 3 letter code, if possible."""
    if len(code) == 3:  # noqa: PLR2004
        return WFO.objects.get(code=code)
    codes = WFO.objects.values_list("code", flat=True)
    matches = [c for c in codes if c in code]
    if not matches:
        raise WFO.DoesNotExist
    if len(matches) > 1:
        raise WFO.MultipleObjectsReturned
    return WFO.objects.get(code=matches[0])


def get_filename_from_header(request):
    """Parse the filename from a Content-Disposition header."""
    # grab the original filename from the request header, if it exists
    msg = Message()
    msg["Content-Disposition"] = request.META.get("HTTP_CONTENT_DISPOSITION", "")
    return msg.get_filename("")


def get_temporary_id(original_filename="", prefix="", default_ext="png"):
    """Create a new temporary filename and uuid for a file upload."""
    original_ext = original_filename.split(".")[-1]
    ext = original_ext if original_ext else default_ext
    uid = uuid.uuid4()
    fid = str(uid).replace("-", "")
    pre = f"{prefix}_" if prefix else ""
    return uid, f"{pre}{fid}.{ext}"
