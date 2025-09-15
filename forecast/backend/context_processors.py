from django.conf import settings


def route_info(request):
    """Return a dict of extra info that will be available to all templates."""
    return {
        "path_name": request.resolver_match.view_name,
        "site_name": settings.SITE_NAME,
        "site_slogan": settings.SITE_SLOGAN,
        "site_logo": settings.SITE_LOGO,
    }
