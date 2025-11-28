from django.db import models
from modelcluster.fields import ParentalKey
from wagtail.admin.panels import FieldPanel, InlinePanel
from wagtail.fields import RichTextField
from wagtail.models import Orderable, Page


class RoadmapPage(Page):
    """Represents a roadmap page."""

    body = RichTextField()

    content_panels = Page.content_panels + [
        FieldPanel("body"),
        # Add a data attribute that flags this inline panel as one that we
        # want to enforce deletion confirmation on.
        InlinePanel("entries", label="Roadmap entries", attrs={"data-wx-confirm-delete": "true"}),
    ]

    def get_context(self, request, *args, **kwargs):
        """Add additional page context."""
        context = super().get_context(request, *args, **kwargs)
        context["entries"] = {}
        context["entries"]["now"] = RoadmapEntry.objects.filter(
            page=self,
            period=RoadmapEntry.RoadmapTimePeriod.Now,
        )
        context["entries"]["next"] = RoadmapEntry.objects.filter(
            page=self,
            period=RoadmapEntry.RoadmapTimePeriod.Next,
        )
        context["entries"]["later"] = RoadmapEntry.objects.filter(
            page=self,
            period=RoadmapEntry.RoadmapTimePeriod.Later,
        )
        return context


class RoadmapEntry(Orderable):
    """Represents a single entry in the roadmap."""

    name = models.TextField()
    description = models.TextField()
    outcome = models.TextField()
    page = ParentalKey(RoadmapPage, on_delete=models.CASCADE, related_name="entries")

    class RoadmapTimePeriod(models.TextChoices):
        """Represents a now/next/later enum value."""

        Now = "now", "Now"
        Next = "next", "Next"
        Later = "later", "Later"

    period = models.CharField(max_length=5, choices=RoadmapTimePeriod.choices)

    panels = [FieldPanel("name"), FieldPanel("period"), FieldPanel("description"), FieldPanel("outcome")]

    def __str__(self):
        return f"{self.name}"
