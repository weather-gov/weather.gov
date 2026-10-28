from django.utils.html import escape
from wagtail import hooks
from wagtail.rich_text import LinkHandler


class NewWindowExternalLinkHandler(LinkHandler):
    """Link handler for external links added in RichTextFields to ensure they open in a new window."""

    # This specifies to do this override for external links only.
    identifier = "external"

    @classmethod
    def expand_db_attributes(cls, attrs):
        """Generate the HTML for the external link with target and rel attributes."""
        href = attrs["href"]
        # Add the target attr, and also rel="noopener" + noreferrer fallback.
        return '<a href="%s" target="_blank" rel="noopener noreferrer">' % escape(href)

@hooks.register("register_rich_text_features")
def register_external_link(features):
    """Register the external link handler with Wagtail."""
    features.register_link_type(NewWindowExternalLinkHandler)
