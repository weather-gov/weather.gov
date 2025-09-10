from django.db import models
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.fields import RichTextField
from modelcluster.models import ClusterableModel
from modelcluster.fields import ParentalKey


class Region(ClusterableModel):
    """
    A Region represents one of the subdivisions of the
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
    A Weather Forecast Office (WFO) is the primary unit
    in the NWS in which forecasts are generated. These
    constitute the actual NWS offices.
    """

    name = models.CharField(max_length=256)
    weight = models.IntegerField(default=0)
    code = models.CharField(max_length=3, unique=True)
    region = ParentalKey(Region, on_delete=models.CASCADE, related_name="wfos")
    about = RichTextField(features=['bold', 'italic', 'link'], default="", blank=True)

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
        MultiFieldPanel(children=[
            FieldPanel("email"),
            FieldPanel("address"),
            FieldPanel("phone"),
            FieldPanel("facebook"),
            FieldPanel("twitter"),
            FieldPanel("youtube")
        ])
    ]

    @property
    def has_social(self):
        return any([self.facebook, self.twitter, self.youtube])
    
    @property
    def has_first_pane(self):
        return any([self.phone, self.address, self.email])
    
    @property
    def has_contact(self):
        return any([self.has_social, self.address, self.email, self.email])

    def __str__(self):
        return f"{self.name} ({self.code})"


class DynamicSafetyInformation(models.Model):
    """
    A record that matches Hazard/Alert types to specific
    safety tips that are recommended by the NWS.
    These tips will be displayed alongside alert information,
    where available
    """

    type = models.CharField(unique=True, max_length=256)
    label = models.CharField(max_length=256)
    body = models.TextField()

    # Panels for Wagtail admin
    panels = [FieldPanel("type"), FieldPanel("label"), FieldPanel("body")]
