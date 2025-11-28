from django.db import models
from wagtail.admin.panels import FieldPanel
from wagtail.fields import RichTextField


class DynamicSafetyInformation(models.Model):
    """
    Represents Hazard/Alert types matched to specific safety tips recommended by the NWS.

    These tips will be displayed alongside alert information, where available
    """

    type = models.CharField(unique=True, max_length=256)
    label = models.CharField(max_length=256)
    body = RichTextField()

    # Panels for Wagtail admin
    panels = [
        FieldPanel(
            "type",
            help_text="This is the alert type, in all lowercase. For example, "
            + '"severe thunderstorm warning" or "wind advisory"',
        ),
        FieldPanel("label", help_text="This is currently unused."),
        FieldPanel(
            "body",
            help_text="This will be displayed alongside alerts of "
            + "this type to provide users more context and safety guidance.",
        ),
    ]

    def __str__(self):
        return self.type
