from django.contrib.auth.models import AbstractUser
from django.db import models
from django.urls import reverse
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from wagtail.admin.panels import FieldPanel, InlinePanel, MultiFieldPanel
from wagtail.fields import RichTextField
from wagtail.models import Orderable, Page


class RoadmapPage(Page):
    """Represents a roadmap page."""

    body = RichTextField()

    content_panels = Page.content_panels + [FieldPanel("body"), InlinePanel("entries", label="Roadmap entries")]

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


class GenericPage(Page):
    """Represents a generic page."""

    body = RichTextField()

    content_panels = Page.content_panels + [FieldPanel("body"), FieldPanel("slug")]


class Region(ClusterableModel):
    """
    Represents a Region.

    A region is one of the subdivisions of the
    world in which the NWS operates (ie, Central Region)
    """

    name = models.CharField(max_length=128)
    weight = models.IntegerField(default=100)

    # Panels for Wagtail admin
    panels = [FieldPanel("name")]

    def __str__(self):
        return f"{self.name}"


class WFO(models.Model):
    """
    Represents a Weather Forecast Office (WFO).

    A WFO is the primary unit in the NWS in which forecasts are generated.
    These constitute the actual NWS offices.
    """

    name = models.CharField(max_length=256)
    weight = models.IntegerField(default=0)
    code = models.CharField(max_length=3, unique=True)
    region = ParentalKey(Region, on_delete=models.CASCADE, related_name="wfos")
    about = RichTextField(features=["bold", "italic", "link"], default="", blank=True)

    # Socials
    facebook = models.URLField(blank=True)
    twitter = models.URLField(blank=True)
    youtube = models.URLField(blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(blank=True, max_length=32)

    # GHWO metadata field
    ghwo_metadata = models.JSONField(default=None, blank=True, null=True)

    # Panels for Wagtail admin
    panels = [
        FieldPanel("name"),
        FieldPanel("code"),
        FieldPanel("region"),
        FieldPanel("about"),
        MultiFieldPanel(
            children=[
                FieldPanel("email"),
                FieldPanel("address"),
                FieldPanel("phone"),
                FieldPanel("facebook"),
                FieldPanel("twitter"),
                FieldPanel("youtube"),
            ],
        ),
    ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def has_social(self):
        """Has FaceBook, Twitter, or YouTube."""
        return bool(self.facebook or self.twitter or self.youtube)

    @property
    def has_first_pane(self):
        """Has phone, address, or email."""
        return bool(self.phone or self.address or self.email)

    @property
    def has_contact(self):
        """Has social media, address, or email."""
        return bool(self.has_social or self.address or self.email)

    @staticmethod
    def normalize_code(code):
        """Return the WFO code normalized for Alaska edge cases."""
        anchorage_alternates = ["ALU", "AER"]
        if code.upper() in anchorage_alternates:
            return "AFC"
        return code.upper()

    @property
    def normalized_code(self):
        """Return the normalized WFO code."""
        return WFO.normalize_code(self.code)

    @property
    def url(self):
        """Return the URL for the wfo office page on this site."""
        return reverse(
            "office",
            kwargs={
                "wfo": self.normalized_code,
            },
        )


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


class NOAAUser(AbstractUser):
    """Represents a User of the Wagtail system who can be authenticated in NOAA ICAM.

    For now, we do no special overrides. This model is just a placeholder
    we can manipulate down the road should we need to.
    It inherits all of the existing functionality of the default User model
    """
