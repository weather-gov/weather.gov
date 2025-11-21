import uuid
from datetime import datetime, timezone

from django.contrib.gis.db.models import PointField
from django.db import models

from backend import util
from backend.models import WFO


class TimeStampedModel(models.Model):
    """An abstract base model that provides self-updating `created_at` and `updated_at` fields."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Declare abstract. Don't put anything else here, it will be ignored."""

        abstract = True


class SituationReportManager(models.Manager):
    """Management tasks for Situation Report records."""

    def current(self, wfo):
        """Fetch the latest situation report that was sent to us."""
        return self.filter(wfo=wfo).order_by("-created_at").first()

    def prune(self, wfo):
        """Remove excess weather stories to save on storage costs."""
        count = self.filter(wfo=wfo).count()
        if count > SituationReport.MAX_SITREP_PER_WFO:
            remove = count - SituationReport.MAX_SITREP_PER_WFO
            keys = self.filter(wfo=wfo).order_by("created_at").values_list("pk")[:remove]
            self.filter(pk__in=keys).delete()


class SituationReport(TimeStampedModel):
    """Represents a Situation Report which is saved as PDF."""

    title = models.CharField(max_length=1000)
    pdf = models.FileField()
    wfo = models.ForeignKey(WFO, on_delete=models.PROTECT)

    objects = SituationReportManager()

    MAX_SITREP_PER_WFO = 14

    def __str__(self):
        return self.title


class WeatherStoryManager(models.Manager):
    """Management tasks for Weather Story records."""

    def current(self, wfo):
        """Fetch all current weather stories, according to their start and end times."""
        now = datetime.now(tz=timezone.utc)
        return self.filter(wfo=wfo, starttime__lte=now, endtime__gte=now).order_by("-starttime")

    def prune(self, wfo):
        """
        Remove excess weather stories to save on storage costs.

        Deletes the oldest stories, but only if their endtime value is in the past.
        """
        count = self.filter(wfo=wfo).count()
        if count > WeatherStory.MAX_STORIES_PER_WFO:
            now = datetime.now(tz=timezone.utc)
            remove = count - WeatherStory.MAX_STORIES_PER_WFO
            keys = self.filter(wfo=wfo, endtime__lte=now).order_by("created_at").values_list("pk")[:remove]
            self.filter(pk__in=keys).delete()


class WeatherStory(TimeStampedModel):
    """Represents a Weather Story which is saved as an image."""

    title = models.CharField(max_length=1000)
    description = models.CharField(max_length=6000, default="")
    cwa_center = PointField(null=True)
    starttime = models.DateTimeField()
    endtime = models.DateTimeField()
    image = models.ImageField()
    small = models.ImageField(null=True)
    wfo = models.ForeignKey(WFO, on_delete=models.PROTECT)

    objects = WeatherStoryManager()

    MAX_STORIES_PER_WFO = 14

    def __str__(self):
        return self.title

    @property
    def html(self):
        """Get the weather story description, sanitized and HTML-ready."""
        return util.mark_safer(self.description, tags={"strong", "em", "ol", "li", "ul"})


class TemporaryImage(TimeStampedModel):
    """
    Track images for an incoming Weather Story.

    Due to the way the API currently works, we do not know what WFO an image
    belongs to when it is first uploaded. This model bridges the gap.

    The API does not need to function this way. It is a historical artifact of
    when we were building Weathergov 2.0 in Drupal.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image = models.ImageField()

    def __str__(self):
        return f"Image {self.id}"


class TemporaryPDF(TimeStampedModel):
    """
    Track PDFs for an incoming Situation Report.

    Due to the way the API currently works, we do not know what WFO a PDF
    belongs to when it is first uploaded. This model bridges the gap.

    The API does not need to function this way. It is a historical artifact of
    when we were building Weathergov 2.0 in Drupal.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField()

    def __str__(self):
        return f"PDF {self.id}"
