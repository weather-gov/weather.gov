from django.contrib.auth.models import AbstractUser
from django.db import models
from django.urls import reverse
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.fields import RichTextField
from wagtail.models import Page


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

    @property
    def normalized_code(self):
        """Return the WFO code normalized for Alaska edge cases."""
        anchorage_alternates = ["alu", "aer"]
        if self.code.lower() in anchorage_alternates:
            return "afc"
        return self.code.lower()

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
    body = models.TextField()

    # Panels for Wagtail admin
    panels = [FieldPanel("type"), FieldPanel("label"), FieldPanel("body")]

    def __str__(self):
        return self.type


class NOAAUser(AbstractUser):
    """Represents a User of the Wagtail system who can be authenticated in NOAA ICAM.

    For now, we do no special overrides. This model is just a placeholder
    we can manipulate down the road should we need to.
    It inherits all of the existing functionality of the default User model
    """
