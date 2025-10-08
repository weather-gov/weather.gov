from django.conf import settings
from django.contrib.sitemaps.views import sitemap
from django.urls import include, path, register_converter
from django.views.generic.base import TemplateView
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.contrib.sitemaps.sitemap_generator import Sitemap as WagtailSitemap
from wagtail.documents import urls as wagtaildocs_urls

from spatial.sitemaps import PlaceSitemap

from . import views
from .url_converters import FloatConverter

register_converter(FloatConverter, "float")

urlpatterns = [
    path("", views.index, name="index"),
    # Our URLs should have trailing slashes. Django will automatically add
    # trailing slashes to requests that don't have them, so if our URLs DON'T
    # have trailing slashes, they'll never match.
    path("offices/<wfo>/", views.offices_specific, name="office"),
    path("afd/", views.afd_index, name="afd_index"),
    path("afd/<wfo>/", views.afd_by_office, name="afd_by_office"),
    path("afd/<wfo>/<afd_id>/", views.afd_by_office_and_id, name="afd_by_office_and_id"),
    # WX routes are those that return partial HTML markup
    # that will be requested from the frontend (htmx style)
    path("wx/afd/<afd_id>/", views.wx_afd_id, name="wx_afd_id"),
    path("wx/afd/locations/<wfo>/", views.wx_afd_versions, name="wx_afd_versions"),
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
    path("cms/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("pages/", include(wagtail_urls)),
    # Point forecast related, etc
    path("point/<float:lat>/<float:lon>/", views.point_location, name="point"),
    path("place/<state>/<place>/", views.place_forecast, name="place forecast"),
    path("health/", views.health, name="health"),
    path("robots.txt", TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),
]

if settings.DEBUG is True:
    urlpatterns += [
        path("offices/", views.offices, name="offices"),
    ]
