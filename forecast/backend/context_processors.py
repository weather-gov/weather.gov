import os

from django.conf import settings

GIT_SHA_HASH = os.getenv("GIT_SHA_HASH")


def route_info(request):
    """Return a dict of extra info that will be available to all templates."""
    # The 404 handler does not have a resolver_match.
    view_name = request.resolver_match.view_name if request.resolver_match else None

    return {
        "path_name": view_name,
        "site_name": settings.SITE_NAME,
        "site_slogan": settings.SITE_SLOGAN,
        "site_logo": settings.SITE_LOGO,
        "debug_show_all_menu_links": settings.DEBUG_SHOW_ALL_MENU_LINKS,
    }


def git_info(request):  # noqa: ARG001
    """Return the current git hash from env variable or None."""
    return {"git_sha_hash": GIT_SHA_HASH}
