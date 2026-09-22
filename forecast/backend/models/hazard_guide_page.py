from django.db import models
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from wagtail.admin.panels import FieldPanel, InlinePanel, MultiFieldPanel
from wagtail.fields import RichTextField
from wagtail.models import Orderable, Page

from .panels import CustomInlinePanel


# The abstract model for related links
class RelatedLink(models.Model):
    """The abstract model for related links."""

    text = models.CharField("Display text", max_length=255)
    url = models.CharField(
        "Link url",
        max_length=255,
        blank=True,
        help_text="The full URL (i.e. https://www.example.com/path/to/resource/), "
        + "or the path if an internal beta.weather.gov page.",
    )

    panels = [
        FieldPanel("text"),
        FieldPanel("url"),
    ]

    class Meta:  # noqa: D106
        abstract = True


# The abstract model for hazard levels
class HazardLevels(models.Model):
    """Represents a single hazard level in the hazard guide."""

    class HazardLevelAlertLevel(models.TextChoices):
        """Represents a other/watch/warning enum value."""

        Other = "other", "Other (Advisory, Special Weather Statement, etc.)"
        Watch = "watch", "Watch"
        Warning = "warning", "Warning/Emergency"

    alert_level = models.CharField(max_length=10, choices=HazardLevelAlertLevel.choices)
    alert_title = models.TextField(help_text="The name of the hazard alert (i.e. Tornado Advisory, Tornado Warning).")
    description = RichTextField(
        help_text="The description of the hazard level, including what it means and what actions to take."
    )

    panels = [FieldPanel("alert_level"), FieldPanel("alert_title"), FieldPanel("description")]

    class Meta:  # noqa: D106
        abstract = True


class HazardGuideIndexPage(Page):
    """Represents the index page for hazard guides."""

    # Only allow HazardGuidePages as children
    subpage_types = ["backend.HazardGuidePage"]
    # Can be created under GenericPage (e.g. the "Preparedness" page)
    parent_page_types = ["backend.GenericPage"]

    content = models.TextField(blank=True, help_text="Intro text for the index page.")

    content_panels = Page.content_panels + [
        FieldPanel(
            "slug",
            help_text="The name of the page as it will appear in URLs. "
                + "For example, https://beta.weather.gov/prepare/hazard-guides/[slug]",
        ),
        FieldPanel("content"),
    ]

    # Get rid of the separate SEO tab.
    promote_panels = []

    def get_context(self, request, *args, **kwargs):
        """Add additional page context."""
        context = super().get_context(request, *args, **kwargs)
        context["hazard_guides"] = HazardGuidePage.objects.live().public().order_by("title")
        return context


class HazardGuidePage(Page):
    """Represents a hazard guide page."""

    # Can only be created under a HazardGuideIndexPage
    parent_page_types = ["backend.HazardGuideIndexPage"]
    # No children allowed
    subpage_types = []

    # We need to define our own meta description in order to make it required.
    # The default search_description provided by the base Page class is allowed
    # to be empty, which makes it optional. So... make our own that can't be
    # empty and carry on.
    meta_description = models.TextField(max_length=155)

    hero_image = models.ForeignKey(
        "wagtailimages.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    alt_text = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional alt text for the hero image. If not set, will be default to the image title.",
    )

    content_panels = Page.content_panels + [
        FieldPanel(
            "slug",
            help_text="The name of the page as it will appear in URLs. "
                + "For example, https://beta.weather.gov/prepare/hazard-guides/[slug]",
        ),
        MultiFieldPanel(
            [
                FieldPanel(
                    "hero_image",
                    help_text="The hero image for the page. This image will be displayed at the top of the page.",
                ),
                FieldPanel(
                    "alt_text",
                    help_text="Optional alt text for the hero image. If not set, will be default to the image title.",
                ),
            ],
            heading="Hero image",
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
                    attrs={"wx-char-counter": True},
                ),
            ],
            heading="Search engine optimization",
        ),
        # Add a data attribute that flags this inline panel as one that we
        # want to enforce deletion confirmation on.
        CustomInlinePanel("sections", label="", attrs={"data-wx-confirm-delete": "true"}),
    ]

    # Get rid of the separate SEO tab.
    promote_panels = []

    def get_context(self, request, *args, **kwargs):
        """Add additional page context."""
        context = super().get_context(request, *args, **kwargs)
        context["sections"] = self.sections.all()
        context["hero_alt_text"] = self.alt_text or (self.hero_image.title if self.hero_image else "")
        context["section_headings"] = [section.header for section in self.sections.all()]

        if self.hero_image and self.hero_image.focal_point_x:
            context["focal_point_x"] = round(self.hero_image.focal_point_x / self.hero_image.width * 100)
            context["focal_point_y"] = round(self.hero_image.focal_point_y / self.hero_image.height * 100)
        else:
            context["focal_point_x"] = 50
            context["focal_point_y"] = 50

        return context


class HazardGuideSection(Orderable, ClusterableModel):
    """Represents a single section in the hazard guide."""

    header = models.CharField(max_length=255)
    content = RichTextField(blank=True)

    class SectionType(models.TextChoices):
        """Represents an alerts/resources/other enum value."""

        Other = "other", "Other"
        Before = "before", "Before - only add one per page"
        During = "during", "During - only add one per page"
        After = "after", "After - only add one per page"
        Alerts = "alerts", "Alerts - only add one per page"
        Resources = "resources", "Resources - only add one per page"

    section_type = models.CharField(max_length=10, choices=SectionType.choices)

    page = ParentalKey(HazardGuidePage, on_delete=models.CASCADE, related_name="sections")

    panels = [
        FieldPanel("header"),
        FieldPanel("section_type"),
        FieldPanel("content"),
        InlinePanel("hazard_level_entries", label="Hazard level entries - only add to Alerts type section"),
        InlinePanel("resource_links", label="Resource links - only add to Resources type section"),
    ]

    def __str__(self):
        return f"{self.header}"


class HazardLevelEntry(Orderable, HazardLevels):
    """Represents a single hazard level entry within the hazard levels section."""

    section = ParentalKey(HazardGuideSection, on_delete=models.CASCADE, related_name="hazard_level_entries")

    panels = HazardLevels.panels

    def __str__(self):
        return f"{self.alert_title}"


class ResourceLink(Orderable, RelatedLink):
    """Represents a single resource link within the resource list."""

    section = ParentalKey(HazardGuideSection, on_delete=models.CASCADE, related_name="resource_links")

    panels = RelatedLink.panels

    def __str__(self):
        return f"{self.text}"
