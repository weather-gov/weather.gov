from django.shortcuts import render

from backend.exceptions import Http429


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
