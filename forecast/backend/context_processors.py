import json
import os
from contextvars import ContextVar

from django.conf import settings
from wagtail.models import Page

from backend.models import HazardGuideIndexPage, RoadmapPage

GIT_SHA_HASH = os.getenv("GIT_SHA_HASH")
TIMING_CONTEXT = ContextVar("timings", default=None)

def route_info(request):
    """Return a dict of extra info that will be available to all templates."""
    # The 404 handler does not have a resolver_match.
    view_name = request.resolver_match.view_name if request.resolver_match else None

    defaults = {
        "path_name": view_name,
        "site_name": settings.SITE_NAME,
        "site_slogan": settings.SITE_SLOGAN,
        "site_logo": settings.SITE_LOGO,
        "debug_show_all_menu_links": settings.DEBUG_SHOW_ALL_MENU_LINKS,
    }
    # timings are only available in dev/staging environments
    if settings.API_TIMINGS_METADATA:
        defaults["timings"] = TIMING_CONTEXT.get()
        defaults["timings_serialized"] = json.dumps(TIMING_CONTEXT.get())

    return defaults


def git_info(request):  # noqa: ARG001
    """Return the current git hash from env variable or None."""
    return {"git_sha_hash": GIT_SHA_HASH}

def global_navigation(request):  # noqa: ARG001
    """Return global navigation context for CMS pages."""
    # Fetch the live pages safely without crashing if they don't exist yet
    # For a generic page, we need to filter by the slug to find it
    about_page = Page.objects.live().filter(slug="about").first()
    # These are custom page models however, so we can pull them based on the model
    hazard_guide_index = HazardGuideIndexPage.objects.live().first()
    roadmap_page = RoadmapPage.objects.live().first()

    return {
        "about_page": about_page,
        "hazard_guide_index": hazard_guide_index,
        "roadmap_page": roadmap_page,
    }
