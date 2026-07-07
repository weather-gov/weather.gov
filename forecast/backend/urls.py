from django.conf import settings
from django.urls import include, path, re_path, register_converter
from django.views.generic.base import RedirectView, TemplateView
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls

from backend.views import county, errors, index, offices, partials, point, risk, state

from .url_converters import FloatConverter

register_converter(FloatConverter, "float")

# Page titles are in django.po with keys like "site.meta.titles.<url_name>".
# These are parsed by the set_title_and_description templatetag.
# IF YOU ADD ROUTES (or change their names), please update django.po.

urlpatterns = [
    path("", index.index, name="index"),
    # Temporary redirect to volunteer sign-up bage for IAEM.
    path("volunteer/", RedirectView.as_view(url="https://www.weather.gov/weathergovsurvey")),
    # Our URLs should have trailing slashes. Django will automatically add
    # trailing slashes to requests that don't have them, so if our URLs DON'T
    # have trailing slashes, they'll never match.
    # Forecast specific URLS
    path("about/offices/<wfo>/", offices.offices_specific, name="office"),
    path("tools/afd/", point.afd_index, name="afd_index"),
    path("tools/afd/<wfo>/", point.afd_by_office, name="afd_by_office"),
    path("tools/afd/<wfo>/<afd_id>/", point.afd_by_office_and_id, name="afd_by_office_and_id"),
    # County pages
    path("forecast/county/", county.index, name="county_index"),
    re_path(r"forecast/county/(?P<county_slug>[\w|-]+-\w+)/$", county.county_overview, name="county_state_overview"),
    path("forecast/county/<str:countyfips>/", county.county_overview, name="county_overview"),
    path("forecast/county/<str:county_fips>/risk-overview/", risk.risk_details_by_county, name="county_risk_overview"),
    # State pages
    path("forecast/state/", state.index, name="state_index"),
    path("forecast/state/<state>/", state.state_alerts, name="state_overview"),
    path("forecast/state/<state>/alerts/", state.state_alerts, name="state_alerts"),
    path("forecast/state/<state>/risks/", state.state_risks, name="state_risks"),
    path("forecast/state/<state_code>/risk-overview/", risk.risk_details_by_state, name="state_risk_overview"),
    path("forecast/state/<state>/radar/", state.state_radar, name="state_radar"),
    path("forecast/state/<state>/analysis/", state.state_analysis, name="state_analysis"),
    path("forecast/risk-overview/", risk.ghwo_index, name="risk_index"),
    # WX routes are those that return partial HTML markup
    # that will be requested from the frontend (htmx style)
    path("wx/afd/<afd_id>/", partials.wx_afd_id, name="wx_afd_id"),
    path("wx/afd/locations/<wfo>/", partials.wx_afd_versions, name="wx_afd_versions"),
    path("wx/select/ghwo/counties/", partials.wx_select_ghwo_counties, name="wx_select_ghwo_counties"),
    path("wx/ghwo/counties/<str:county_fips>/", partials.wx_ghwo_counties, name="wx_ghwo_counties"),
    path("wx/ghwo/state/<str:state_code>/", partials.wx_ghwo_all_counties_for_state, name="wx_ghwo_state_all"),
    path("wx/state/<state>/", partials.wx_state_boundaries_pbf, name="wx_state_boundary"),
    path("wx/state/<state>/alerts", partials.wx_state_alerts_pbf, name="wx_state_boundary"),
    # Wagtail
    path("cms/logout/", RedirectView.as_view(url="/saml/logout/")),  # override wagtail logout
    path("cms/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    # Point forecast related, etc
    path("forecast/point/<float:lat>/<float:lon>/", point.point_location, name="point"),
    path("place/<state>/<place>/", point.place_forecast, name="place_forecast"),
    path("health/", index.health, name="health"),
    path("llms.txt", TemplateView.as_view(template_name="llms.txt", content_type="text/plain")),
    path("robots.txt", TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),
    # Deprecated URLs with custom 404 pages
    path("offices/<wfo>/", errors.deprecated_office, name="deprecated_office"),
    path("point/<float:lat>/<float:lon>/", errors.deprecated_path, name="deprecated_point"),
    path("county<path:rest>", errors.deprecated_path, name="deprecated_county_pages"),
]

if settings.DEBUG is True:
    urlpatterns += [
        path("about/offices/", offices.offices, name="offices"),
        # Because this is only used for debugging, go ahead and redirect to the new URL
        path("offices/", RedirectView.as_view(url="/about/offices/")),
    ]
