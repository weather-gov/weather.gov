from wagtail.admin.panels import FieldPanel
from wagtail.fields import RichTextField
from wagtail.models import Page


class GenericPage(Page):
    """Represents a generic page."""

    body = RichTextField()

    content_panels = Page.content_panels + [FieldPanel("body"), FieldPanel("slug")]
