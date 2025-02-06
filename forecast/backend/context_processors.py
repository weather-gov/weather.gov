from django.conf import settings


def route_info(request):
    return {
        "path_name": request.resolver_match.view_name,
        "site_name": settings.SITE_NAME,
        "site_slogan": settings.SITE_SLOGAN,
        "site_logo": settings.SITE_LOGO,
    }
