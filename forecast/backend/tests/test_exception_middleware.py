from unittest import mock

from django.http import HttpResponse
from django.test import RequestFactory, TestCase, override_settings

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
        request = RequestFactory().get("/forecast/point/rate-limited")
        with self.assertRaises(Http429):  # noqa: PT027
            middleware(request)

    def test_504_handled_response(self):
        """Ensure proper handling of raised Http429 by middleware."""
        middleware = GatewayTimeoutMiddleware(get_response=get_gateway_timeout_exception)
        request = RequestFactory().get("/forecast/oint/rate-limited")
        with self.assertRaises(Http504):  # noqa: PT027
            middleware(request)


class ExceptionMiddlewarePageTitleTest(TestCase):
    """Tests for error page titles."""

    @override_settings(DEBUG=True)
    @mock.patch("backend.views.point.interop.get_point_forecast", side_effect=Http429)
    def test_429_page_title(self, mock_get_point_forecast):  # noqa: ARG002
        """If interop bombs then title should have `fullName`."""
        response = self.client.get("/forecast/point/11.1/22.2/alerts/")

        self.assertEqual(response.status_code, 429)
        self.assertContains(response, "<title>429 |", status_code=429)

    @override_settings(DEBUG=True)
    @mock.patch("backend.views.point.interop.get_point_forecast", side_effect=Http504)
    def test_504_page_title(self, mock_get_point_forecast):  # noqa: ARG002
        """If interop bombs then title should have `fullName`."""
        response = self.client.get("/forecast/point/11.1/22.2/alerts/")

        self.assertEqual(response.status_code, 504)
        self.assertContains(response, "<title>504 |", status_code=504)
