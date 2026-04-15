from django.http import HttpResponse
from django.test import RequestFactory, TestCase

from backend.exceptions import Http429
from backend.middleware import TooManyRequestsMiddleware


def get_response_exception(response):  # noqa: D103, ARG001
    raise Http429


class TooManyRequestsMiddlewareTest(TestCase):
    """Tests for TooManyRequestsMiddleware."""

    def test_normal_response(self):
        """Ensure middleware passes on normal requests."""
        basic_response = HttpResponse(status=200)
        middleware = TooManyRequestsMiddleware(get_response=lambda r: basic_response)  # noqa: ARG005
        request = RequestFactory().get("/about")
        response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertTemplateNotUsed("errors/429.html")

    def test_429_handled_response(self):
        """Ensure proper handling of raised Http429 by middleware."""
        middleware = TooManyRequestsMiddleware(get_response=get_response_exception)
        request = RequestFactory().get("/point/rate-limited")

        with self.assertRaises(Http429):  # noqa: PT027
            response = middleware(request)
            self.assertEqual(response.status_code, 429)
            self.assertTemplateUsed("errors/429.html")
