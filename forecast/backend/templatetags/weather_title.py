import logging

from django import template
from django.conf import settings
from django.utils.safestring import mark_safe
from django.utils.translation import gettext_lazy as _

from backend.util import mark_safer

logger = logging.getLogger(__name__)
register = template.Library()


@register.simple_tag(takes_context=True)
def set_title_and_description(context):
    """
    Set the title, meta title, and meta description.

    Uses the url_name of the view (found in urls.py) to look up
    the translation key. If `title_trans_args` is in the context,
    that will be passed to `gettext` for interpolation.
    """
    page = context.get("page", {})
    request = context.get("request", None)
    page_title = ""
    description = ""

    if isinstance(page, dict) and request and request.resolver_match:
        # this is a Django managed page
        url_name = request.resolver_match.url_name
        key_for_title = f"site.meta.titles.{url_name}"
        key_for_descr = f"site.meta.description.{url_name}"
        # translate the text
        try:
            interpolation = context.get("title_trans_args", {})
            page_title = _(key_for_title) % interpolation
            description = _(key_for_descr) % interpolation
        except KeyError as e:
            err_msg = "Failed to translate page title"
            logger.exception(err_msg)
            if settings.DEBUG is True:
                raise ValueError(err_msg) from e
    else:
        # this is a Wagtail CMS managed page
        page_title = getattr(page, "title", "")
        description = getattr(page, "meta_description", "")

    agency_name = getattr(settings, "AGENCY_NAME", "")


    if page_title == agency_name:
        title = agency_name
    else:
        title = f"{page_title} | {agency_name}"
    seo_title = getattr(page, "seo_title", title)

    # this is needed because lxml will strip the `title` and `meta` tags
    cleaned_title = mark_safer(title)
    cleaned_seo_title = mark_safer(seo_title)
    cleaned_description = mark_safer(description)

    return mark_safe(f"""
        <title>{cleaned_title}</title>
        <meta name="title" content="{cleaned_seo_title}" />
        <meta name="description" content="{cleaned_description}" />
        """)  # noqa: S308
