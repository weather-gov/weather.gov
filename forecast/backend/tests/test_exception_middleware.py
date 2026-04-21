from django.http import HttpResponse
from django.test import RequestFactory, TestCase

from backend.exceptions import Http429, Http504
from backend.middleware import GatewayTimeoutMiddleware, TooManyRequestsMiddleware


def get_too_many_requests_exception(response):  # noqa: D103, ARG001
    raise Http429


def get_gateway_timeout_exception(response):  # noqa: D103, ARG001
    raise Http504


class ExceptionMiddlewareTest(TestCase):
    """Tests for TooManyRequestsMiddleware."""

    def test_normal_response(self):
        """Ensure middleware passes on normal requests."""
        basic_response = HttpResponse(status=200)
        middleware = GatewayTimeoutMiddleware(TooManyRequestsMiddleware(get_response=lambda r: basic_response))  # noqa: ARG005
        request = RequestFactory().get("/about")
        response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertTemplateNotUsed("errors/429.html")
        self.assertTemplateNotUsed("errors/504.html")

    def test_429_handled_response(self):
        """Ensure proper handling of raised Http429 by middleware."""
        middleware = TooManyRequestsMiddleware(get_response=get_too_many_requests_exception)
        request = RequestFactory().get("/point/rate-limited")
        with self.assertRaises(Http429):  # noqa: PT027
            middleware(request)

    def test_504_handled_response(self):
        """Ensure proper handling of raised Http429 by middleware."""
        middleware = GatewayTimeoutMiddleware(get_response=get_gateway_timeout_exception)
        request = RequestFactory().get("/point/rate-limited")
        with self.assertRaises(Http504):  # noqa: PT027
            middleware(request)
