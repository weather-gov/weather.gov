from django.shortcuts import render

from backend.exceptions import Http429, Http504


class TooManyRequestsMiddleware:
    """
    Handle 429 exceptions and render a custom page.

    Http429 exceptions are thrown based on responses from the
    interop that come back as status code 429, indicating that
    the system is currently experiencing an excessive
    request volume.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        """Handle middleware call."""
        return self.get_response(request)

    def process_exception(self, request, exception):
        """
        Handle Http429 exception specifically.

        By returning None otherwise, other middlewares
        can handle other exceptions, including built-in
        Django server exceptions (as normal).
        """
        if isinstance(exception, Http429):
            response = render(request, "errors/429.html")
            response.status_code = 429
            return response
        return None


class GatewayTimeoutMiddleware:
    """
    Handle 504 exceptions and render a custom page.

    Http504 exceptions are thrown based on responses from the
    interop that come back as status code 504, indicating that
    the API took too long to respond.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        """Handle middleware call."""
        return self.get_response(request)

    def process_exception(self, request, exception):
        """
        Handle Http504 exception specifically.

        By returning None otherwise, other middlewares
        can handle other exceptions, including built-in
        Django server exceptions (as normal).
        """
        if isinstance(exception, Http504):
            response = render(request, "errors/504.html")
            response.status_code = 504
            return response
        return None
