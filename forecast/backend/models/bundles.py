from django.db import models
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from wagtail.admin.panels import FieldPanel, InlinePanel


class Bundle(ClusterableModel):
    """Represents a collection of stored/mocked source data."""

    # The name of the bundle. Should be unique in the table.
    name = models.CharField(max_length=255, unique=True)

    # A short description of what the bundle is for (testing, etc)
    description = models.TextField()

    class Meta: # noqa: D106
        db_table = "weathergov_bundles"
        app_label = "backend"

    panels = [
        FieldPanel("name"),
        FieldPanel("description"),
        InlinePanel("bundle", label="Sources"),
    ]

    def __str__(self):
        return f"{self.name}"


class BundleSource(ClusterableModel):
    """
    Represents a single API (or other data fetch) as used in a bundle.

    Rows in this table use the underlying API (or other source) urls as
    the identifiers. Consumers can group by the bundle name.
    """

    # The URL used to access the resource, path only
    # Ex: /gridpoints/LWX/34/34/forecast
    url = models.CharField(max_length=255, db_index=True)

    # Provides a reference to the kind of source this data is from
    # Ex: "api", "ghwo", etc.
    # This allows us to handle playing back the data in different ways
    # as we see fit.
    type = models.CharField(
        max_length=255,
        choices={
            "API": "api",
            "WPC": "wpcprob",
            "GHWO": "ghwo",
            "ALERTS": "alerts"
        },
        default="api",
    )

    # The source data for the bundle, as JSON
    data = models.JSONField()

    # Relation to a parent bundle
    bundle = ParentalKey(Bundle, related_name="bundle", on_delete=models.CASCADE)

    class Meta: # noqa: D106
        db_table = "weathergov_bundle_sources"
        app_label = "backend"

    panels = [
        FieldPanel("url"),
        FieldPanel("data"),
        FieldPanel("bundle"),
    ]

    def __str__(self):
        return f"({self.type}) {self.url}"
