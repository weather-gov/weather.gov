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
    if not full_name:
        full_name = context.get("approximate_name", None)
    page = context.get("page", {})

    if isinstance(page, dict):
        page_title = page.get("title", "")
        seo_title = page.get("seo_title", "")
        description = page.get("meta_description", "")
        if not description:
            description = page.get("search_description", "")
    else:
        page_title = getattr(page, "title", "")
        seo_title = getattr(page, "seo_title", "")
        description = getattr(page, "meta_description", "")
        if not description:
            description = getattr(page, "search_description", "")

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
    if not seo_title:
        seo_title = title

    # this is needed because lxml will strip the `title` and `meta` tags
    cleaned_title = mark_safer(title)
    cleaned_seo_title = mark_safer(seo_title)
    cleaned_description = mark_safer(description)

    return mark_safe(f"""
        <title>{cleaned_title}</title>
        <meta name="title" content="{cleaned_seo_title}" />
        <meta name="description" content="{cleaned_description}" />
        """)  # noqa: S308
