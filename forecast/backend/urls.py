from django.conf import settings
from django.contrib.sitemaps.views import sitemap
from django.urls import include, path, register_converter
from django.views.generic.base import RedirectView, TemplateView
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.contrib.sitemaps.sitemap_generator import Sitemap as WagtailSitemap
from wagtail.documents import urls as wagtaildocs_urls

from backend.views import (
    county,
    index,
    partials,
    point,
    state,
    static,
)
from spatial.sitemaps import PlaceSitemap

from .url_converters import FloatConverter

register_converter(FloatConverter, "float")

urlpatterns = [
    path("", index.index, name="index"),
    # Temporary redirect to volunteer sign-up bage for IAEM.
    path("volunteer/", RedirectView.as_view(url="https://www.weather.gov/weathergovsurvey")),
    # Our URLs should have trailing slashes. Django will automatically add
    # trailing slashes to requests that don't have them, so if our URLs DON'T
    # have trailing slashes, they'll never match.
    # Static pages for the site
    path("about/", static.site_page, name="about"),
    path("site-index/", static.site_page, name="site_index"),
    path("accessibility/", static.site_page, name="accessibility"),
    path("disclaimer/", static.site_page, name="disclaimer"),
    path("privacy/", static.site_page, name="privacy"),
    # Forecast specific URLS
    path("offices/<wfo>/", point.offices_specific, name="office"),
    path("afd/", point.afd_index, name="afd_index"),
    path("afd/<wfo>/", point.afd_by_office, name="afd_by_office"),
    path("afd/<wfo>/<afd_id>/", point.afd_by_office_and_id, name="afd_by_office_and_id"),
    # County pages
    path("county/", county.index, name="county_index"),
    path("county/<countyfips>/", county.county_overview, name="county_overview"),
    path("counties/ghwo/", county.county_ghwo_index, name="county_ghwo_index"),
    path("counties/ghwo/<str:county_fips>", county.county_ghwo, name="county_ghwo"),
    # State pages
    path("state/", state.index, name="state_index"),
    path("state/<state>/", state.state_overview, name="state_overview"),
    # WX routes are those that return partial HTML markup
    # that will be requested from the frontend (htmx style)
    path("wx/afd/<afd_id>/", partials.wx_afd_id, name="wx_afd_id"),
    path("wx/afd/locations/<wfo>/", partials.wx_afd_versions, name="wx_afd_versions"),
    path("wx/select/ghwo/counties/", partials.wx_select_ghwo_counties, name="wx_select_ghwo_counties"),
    path("wx/ghwo/counties/<str:county_fips>/", partials.wx_ghwo_counties, name="wx_ghwo_counties"),
    path(
        "sitemap.xml",
        sitemap,
        {
            "sitemaps": {
                "wagtail": WagtailSitemap,
                "places": PlaceSitemap,
            },
        },
        name="django.contrib.sitemaps.views.sitemap",
    ),
    # Wagtail
    path("cms/logout/", RedirectView.as_view(url="/saml/logout")),  # override wagtail logout
    path("cms/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    # Point forecast related, etc
    path("point/<float:lat>/<float:lon>/", point.point_location, name="point"),
    path("place/<state>/<place>/", point.place_forecast, name="place_forecast"),
    path("health/", index.health, name="health"),
    path("llms.txt", TemplateView.as_view(template_name="llms.txt", content_type="text/plain")),
    path("robots.txt", TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),
    path("csp-report/", include("cspreports.urls")),
]

if settings.DEBUG is True:
    urlpatterns += [
        path("offices/", point.offices, name="offices"),
        path("silk/", include("silk.urls", namespace="silk")),
    ]
