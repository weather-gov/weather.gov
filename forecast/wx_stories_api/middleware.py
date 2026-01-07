import json
import os

from django.core.exceptions import PermissionDenied


class FilterIPMiddleware:
    """Middleware to filter weather story uploads by IP address."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.is_enabled = False

        if "VCAP_SERVICES" in os.environ:
            self.is_enabled = True
            vcap_services = json.loads(os.environ["VCAP_SERVICES"])
            user_provided = vcap_services["user-provided"]
            # find the appropriate credential service from cloud.gov, since
            # there might be other services (such as logshipper).
            service = next(
                service
                for service in user_provided
                if service["name"].endswith("credentials")
            )
            self.allowed_ips = service["credentials"]["allowed_ips"]

    def __call__(self, request):
        """Invoke the default get_response."""
        return self.get_response(request)

    def process_view(self, request, *args):
        """Check to see if this IP matches our IP allowed list."""
        if (
            self.is_enabled
            and request.resolver_match
            and request.resolver_match.route.startswith("jsonapi/")
        ):
            forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
            if not forwarded:  # must be present
                raise PermissionDenied
            # left-most is the original IP
            ip = forwarded.split(",")[0].strip()
            if ip not in self.allowed_ips:
                raise PermissionDenied

        # IP filtering passed.
        return None  # noqa: PLR1711, RET501
