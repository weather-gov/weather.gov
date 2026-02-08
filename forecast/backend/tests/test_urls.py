from django.test import TestCase
from django.urls import resolve, reverse

from backend.views import (
    county,
    index,
    partials,
    point,
    state,
)


class TestUrls(TestCase):
    """Test URL patterns."""

    # We don't test the Wagtail URLs because they end up being a whole group
    # of URLs and we don't want to wade into its implementation details. We
    # also don't test robots.txt because, bluntly, I wasn't sure how.
    #
    # An important note for these tests: our Django URLs are *ALL* terminated
    # with a trailing slash. Thus, when using the resolve() method and when
    # checking the URL path returned by the reverse() method, BE SURE TO INCLUDE
    # THE TRIALING SLASH. Doing otherwise could cost you some time because the
    # error message is not immediately obvious.

    def test_index(self):
        """Test index."""
        resolver = resolve("/")
        back = reverse("index")
        self.assertEqual(resolver.func, index.index)
        self.assertEqual(back, "/")

    def test_office_url(self):
        """Test WFO office."""
        resolver = resolve("/offices/WFO/")
        back = reverse("office", kwargs={"wfo": "Howdy"})
        self.assertEqual(resolver.func, point.offices_specific)
        self.assertEqual(resolver.kwargs, {"wfo": "WFO"})
        self.assertEqual(back, "/offices/Howdy/")

    def test_afd_index(self):
        """Test AFD index."""
        resolver = resolve("/afd/")
        back = reverse("afd_index")
        self.assertEqual(resolver.func, point.afd_index)
        self.assertEqual(back, "/afd/")

    def test_afd_by_office(self):
        """Test AFD by office."""
        resolver = resolve("/afd/WFO/")
        back = reverse("afd_by_office", kwargs={"wfo": "Doody"})
        self.assertEqual(resolver.func, point.afd_by_office)
        self.assertEqual(resolver.kwargs, {"wfo": "WFO"})
        self.assertEqual(back, "/afd/Doody/")

    def test_afd_by_office_and_id(self):
        """Test AFD by office and ID."""
        resolver = resolve("/afd/WFO/afdid/")
        back = reverse("afd_by_office_and_id", kwargs={"wfo": "To", "afd_id": "Fro"})
        self.assertEqual(resolver.func, point.afd_by_office_and_id)
        self.assertEqual(resolver.kwargs, {"wfo": "WFO", "afd_id": "afdid"})
        self.assertEqual(back, "/afd/To/Fro/")

    def test_wx_afd_id(self):
        """Test AFD by ID fragment."""
        resolver = resolve("/wx/afd/totoro/")
        back = reverse("wx_afd_id", kwargs={"afd_id": "catbus"})
        self.assertEqual(resolver.func, partials.wx_afd_id)
        self.assertEqual(resolver.kwargs, {"afd_id": "totoro"})
        self.assertEqual(back, "/wx/afd/catbus/")

    def test_wx_afd_location_versions(self):
        """Test AFD location versions fragment."""
        resolver = resolve("/wx/afd/locations/Columbus/")
        back = reverse("wx_afd_versions", kwargs={"wfo": "Jackson"})
        self.assertEqual(resolver.func, partials.wx_afd_versions)
        self.assertEqual(resolver.kwargs, {"wfo": "Columbus"})
        self.assertEqual(back, "/wx/afd/locations/Jackson/")

    def test_point(self):
        """Test point forecast."""
        resolver = resolve("/point/-82.537/42.535/")
        back = reverse("point", kwargs={"lat": 40.235, "lon": 34.532})
        self.assertEqual(resolver.func, point.point_location)
        self.assertEqual(resolver.kwargs, {"lat": -82.537, "lon": 42.535})
        self.assertEqual(back, "/point/40.235/34.532/")

    def test_place(self):
        """Test place forecast."""
        resolver = resolve("/place/State/Of_Mind/")
        back = reverse(
            "place_forecast",
            kwargs={"state": "Franklin", "place": "Anywhere"},
        )
        self.assertEqual(resolver.func, point.place_forecast)
        self.assertEqual(resolver.kwargs, {"state": "State", "place": "Of_Mind"})
        self.assertEqual(back, "/place/Franklin/Anywhere/")

    def test_health(self):
        """Test health endpoint."""
        resolver = resolve("/health/")
        back = reverse("health")
        self.assertEqual(resolver.func, index.health)
        self.assertEqual(back, "/health/")

    def test_robots(self):
        """Test for robots.txt."""
        # It can be sufficient to test that this resolver doesn't fail. If we
        # get a raised exception here, it's because the path doesn't exist
        # anymore.
        resolve("/robots.txt")

    def test_county_index(self):
        """Test county index."""
        resolver = resolve("/county/")
        back = reverse("county_index")
        self.assertEqual(resolver.func, county.index)
        self.assertEqual(back, "/county/")

    def test_county_overview(self):
        """Test county overview page."""
        resolver = resolve("/county/12345/")
        back = reverse("county_overview", kwargs={"countyfips": "54321"})
        self.assertEqual(resolver.func, county.county_overview)
        self.assertEqual(resolver.kwargs, {"countyfips": "12345"})
        self.assertEqual(back, "/county/54321/")

    def test_state_index(self):
        """Test state index."""
        resolver = resolve("/state/")
        back = reverse("state_index")
        self.assertEqual(resolver.func, state.index)
        self.assertEqual(back, "/state/")

    def test_state_overview(self):
        """Test state overview page."""
        resolver = resolve("/state/AB/")
        back = reverse("state_overview", kwargs={"state": "ZY"})
        self.assertEqual(resolver.func, state.state_overview)
        self.assertEqual(resolver.kwargs, {"state": "AB"})
        self.assertEqual(back, "/state/ZY/")
