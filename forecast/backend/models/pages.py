from django.db import models
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.fields import RichTextField
from wagtail.models import Page


class GenericPage(Page):
    """Represents a generic page."""

    body = RichTextField()

    # We need to define our own meta description in order to make it required.
    # The default search_description provided by the base Page class is allowed
    # to be empty, which makes it optional. So... make our own that can't be
    # empty and carry on.
    meta_description = models.TextField()

    content_panels = Page.content_panels + [
        FieldPanel("body"),
        FieldPanel(
            "slug",
            help_text="The name of the page as it will appear in URLs. For example, https://beta.weather.gov/[slug]",
        ),
        MultiFieldPanel(
            [
                FieldPanel(
                    "meta_description",
                    heading="Description",
                    help_text="Your meta description should be 155 characters or "
                    + "less. It should be a unique description of the page content "
                    + "and contain action verbs. Example: Learn how to prepare and "
                    + "stay safe during a hurricane.",
                ),
            ],
            heading="Search engine optimization",
        ),
    ]

    # Get rid of the separate SEO tab.
    promote_panels = []
