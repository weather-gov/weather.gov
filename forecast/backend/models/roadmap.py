from django.db import models
from modelcluster.fields import ParentalKey
from wagtail.admin.panels import FieldPanel, InlinePanel, MultiFieldPanel
from wagtail.fields import RichTextField
from wagtail.models import Orderable, Page


class RoadmapPage(Page):
    """Represents a roadmap page."""

    body = RichTextField()

    # We need to define our own meta description in order to make it required.
    # The default search_description provided by the base Page class is allowed
    # to be empty, which makes it optional. So... make our own that can't be
    # empty and carry on.
    meta_description = models.TextField()

    content_panels = Page.content_panels + [
        FieldPanel(
            "slug",
            help_text="The name of the page as it will appear in URLs. For example, https://beta.weather.gov/[slug]",
        ),
        FieldPanel("body"),
        # Add a data attribute that flags this inline panel as one that we
        # want to enforce deletion confirmation on.
        InlinePanel("entries", label="Roadmap entries", attrs={"data-wx-confirm-delete": "true"}),
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
