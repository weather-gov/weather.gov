from django import template
from django.conf import settings
from django.utils.safestring import mark_safe

from backend.util import mark_safer

register = template.Library()

@register.simple_tag(takes_context=True)
def set_title_and_description(context):
    """Set the title, meta title, and meta description."""
    title_elements = []

    full_name = context.get("point", {}).get("place", {}).get("fullName", None)
    page = context.get("page", {})
    page_title = page.get("title", None)

    site_name = getattr(settings, "SITE_NAME", None)
    agency_name = getattr(settings, "AGENCY_NAME", "")

    if full_name:
        title_elements.append(str(full_name))
    elif page_title:
        title_elements.append(str(page_title))
    elif site_name:
        title_elements.append(str(site_name))

    if agency_name:
        title_elements.append(agency_name)

    title = " | ".join(title_elements)
    seo_title = title

    if page.get("seo_title", None):
        seo_title = page["seo_title"]

    if page.get("meta_description", None):
        description = page["meta_description"]
    elif page.get("search_description", None):
        description = page["search_description"]
    else:
        description = ""

    # this is needed because lxml will strip the `title` and `meta` tags
    cleaned_title = mark_safer(title)
    cleaned_seo_title = mark_safer(seo_title)
    cleaned_description = mark_safer(description)

    return mark_safe(f"""
        <title>{cleaned_title}</title>
        <meta name="title" content="{cleaned_seo_title}" />
        <meta name="description" content="{cleaned_description}" />
        """)  # noqa: S308
