from django.db import models
from django.forms import Textarea
from wagtail.admin.panels import FieldPanel, InlinePanel
from modelcluster.models import ClusterableModel
from modelcluster.fields import ParentalKey
from wagtail.models import Orderable


class Region(ClusterableModel):
    name = models.CharField(max_length=128)
    weight = models.IntegerField(default=100)

    # Panels for Wagtail admin
    panels = [
        FieldPanel("name")
    ]

    def __str__(self):
        return f"{self.name}"

class WFO(models.Model):
    name = models.CharField(max_length=256)
    weight = models.IntegerField(default=0)
    code = models.CharField(max_length=3, unique=True)
    region = ParentalKey(Region, on_delete=models.CASCADE, related_name="region")

    # Panels for Wagtail admin
    panels = [
        FieldPanel("name"),
        FieldPanel("code"),
        FieldPanel("region")
        # InlinePanel("region")
    ]

    def __str__(self):
        return f"{self.name} ({self.code})"

class DynamicSafetyInformation(models.Model):
    type = models.CharField(unique=True, max_length=256)
    label = models.CharField(max_length=256)
    body = models.TextField()

    # Panels for Wagtail admin
    panels = [
        FieldPanel("type"),
        FieldPanel("label"),
        FieldPanel("body")
    ]
