from django.shortcuts import render
from django.utils.translation import gettext_lazy as _


def site_page(request):
    """Render one of the main static site pages.

    These include things like the about page,
    site map, disclaimer, etc
    """
    tokens = [t for t in request.path.split("/") if t != ""]
    name = tokens[-1]
    name = name.replace("_", "-")
    locale_id = f"site.meta.titles.{name}.01"
    page = {
        "title": _(locale_id),
    }
    context = {"page": page}

    return render(request, f"weather/{name}.html", context)
