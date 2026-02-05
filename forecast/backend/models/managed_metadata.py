from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from wagtail.admin.panels import FieldPanel
from wagtail.fields import RichTextField

from .org_structure import WFO


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


class HazardousWeatherOutlookMetadata(ClusterableModel):
    """Represents hazardous weather outlook metadata."""

    class Keys(models.TextChoices):
        """Represents the list of hazardous weather types."""

        blowing_dust = "BlowingDust", "Blowing Dust Risk"
        coastal_flood = "CoastalFlood", "Coastal Flood Risk"
        convective_wind = "ConvectiveWind", "Thunderstorm Wind Risk"
        excessive_rainfall = "ExcessiveRainfall", "Excessive Rainfall Risk"
        extreme_cold = "ExtremeCold", "Extreme Cold Risk"
        extreme_heat = "ExtremeHeat", "Extreme Heat Risk"
        fire_weather = "FireWeather", "Fire Weather Risk"
        fog = "Fog", "Fog Risk"
        freezing_spray = "FreezingSpray", "Freezing Spray Risk"
        frost_freeze = "Frost/Freeze", "Frost/Freeze Risk"
        hail = "Hail", "Hail Risk"
        high_surf = "HighSurf", "High Surf Risk"
        ice_accumulation = "IceAccumulation", "Ice Accumulation Risk"
        lakeshore_flood = "LakeshoreFlood", "Lakeshore Flood Risk"
        lightning = "Lightning", "Lightning Risk"
        marine = "Marine", "Marine Hazard Risk"
        non_convective_wind = "NonConvectiveWind", "Wind Risk"
        rip = "RipRisk", "Rip Current Risk"
        severe_thunderstorm = "SevereThunderstorm", "Severe Thunderstorm Risk"
        snow_sleet = "SnowSleet", "Snow/Sleet Risk"
        swim = "SwimRisk", "Swim Risk"
        tornado = "Tornado", "Tornado Risk"

    type = models.CharField(max_length=256, choices=Keys.choices)
    basis = RichTextField()
    wfo = ParentalKey(WFO, on_delete=models.CASCADE, related_name="hazardous_outlook_metadata", null=True)

    class Meta:
        """Django metadata."""

        unique_together = ["type", "wfo"]

    panels = [FieldPanel("type"), FieldPanel("basis")]

    def __str__(self):
        return self.get_type_display()

    @classmethod
    def get_all_types(cls):
        """Get a list of hazardous risk types."""
        return {risk.value: risk.label for risk in cls.Keys}

    @property
    def name(self):
        """The human-readable version of the type."""
        return self.get_type_display()


class HazardousWeatherOutlookLevels(models.Model):
    """Represents a single level of a hazardous weather risk."""

    label = models.CharField(max_length=30, blank=True)
    number = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(5)])
    description = RichTextField(blank=True)
    wfo = ParentalKey(WFO, on_delete=models.CASCADE, related_name="hazardous_outlook_levels", null=True)
    type = models.CharField(max_length=256, choices=HazardousWeatherOutlookMetadata.Keys)

    class Meta:
        """Django metadata."""

        unique_together = ["type", "number", "wfo"]

    panels = [FieldPanel("type"), FieldPanel("number"), FieldPanel("label"), FieldPanel("description")]

    def __str__(self):
        return f"{self.type}, level {self.number}"
