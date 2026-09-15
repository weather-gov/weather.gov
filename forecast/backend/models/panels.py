from wagtail.admin.panels import InlinePanel


class CustomInlinePanel(InlinePanel):
    """Shared Custom InlinePanel that includes a confirmation prompt for deletions."""

    class BoundPanel(InlinePanel.BoundPanel):
        """Bind the panel to include the inline panel confirm delete javascript."""

        class Media:  # noqa: D106
            js = ["js/cms/inline-panel-confirm-delete.js"]
