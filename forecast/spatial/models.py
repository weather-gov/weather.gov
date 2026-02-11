from django.contrib.gis.db import models
from django.db.models import JSONField
from django.utils.text import format_lazy
from django.utils.translation import gettext_lazy as _


class WeatherSpatialMetadata(models.Model):
    """Metadata about our spatial data."""

    table = models.TextField(primary_key=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_metadata"


class WeatherZone(models.Model):
    """Represents a forecast, fire, or marine zone."""

    id = models.CharField(max_length=45, primary_key=True)
    state = models.CharField(max_length=2, null=True)
    shape = models.GeometryField()
    type = models.TextField(null=True)

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_zones"


class WeatherPlace(models.Model):
    """Represents a physical place."""

    name = models.TextField(null=True)
    state = models.TextField(null=True)
    statename = models.TextField(null=True)
    statefips = models.CharField(max_length=2, null=True)
    county = models.TextField(null=True)
    countyfips = models.CharField(max_length=5, null=True)
    timezone = models.TextField(null=True)
    point = models.PointField()

    @staticmethod
    def get_nearest_match(state, place):
        """Attempt to get a place with a similar state/place name."""
        # We will use the Levenshtein distance on both the state and the place
        # name to find a place that seems like a probable match.
        #
        # The state distance should be less than 2; a distance of 2 or more
        # means that it it doesn't match either of the actual provided letters
        # but is instead "nearby" letters, which... seemed wrong.
        #
        # Also impose a minimum distance on the place name. Otherwise we could
        # end up finding a place that is not even remotely close.
        #
        # Finally, order by the two distances. We order by state first on the
        # assumption that either the user typed the state correctly or else the
        # place name is unique enough within the correct state that it'll float
        # to the top anyway.
        maybe = WeatherPlace.objects.raw(
            """
            SELECT * FROM weathergov_geo_places
            WHERE
                levenshtein(UPPER(state), UPPER(%s)) < 2
                AND
                levenshtein(UPPER(name), UPPER(%s)) < 6
            ORDER BY
                levenshtein(UPPER(state),UPPER(%s)),
                levenshtein(UPPER(name),UPPER(%s))
            LIMIT 1
            """,
            [state, place, state, place],
        )

        # If we got results, return the first one.
        return maybe[0] if maybe else None

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_places"


class WeatherStates(models.Model):
    """Represents a US state, district, or territory."""

    state = models.CharField(max_length=2, null=True)
    name = models.TextField(null=True)
    fips = models.CharField(max_length=2, null=True)
    shape = models.GeometryField()

    def __str__(self):
        return self.state

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_states"


class WeatherCountyWarningAreas(models.Model):
    """Represents an NWS county warning area (CWA)."""

    wfo = models.CharField(max_length=3, null=True)
    cwa = models.CharField(max_length=3, null=True)
    region = models.CharField(max_length=2, null=True)
    city = models.CharField(max_length=50, null=True)
    state = models.ForeignKey(WeatherStates, null=True, on_delete=models.SET_NULL)
    shape = models.GeometryField()

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_cwas"


class WeatherCounties(models.Model):
    """Represents a county, borough, parish, or US Census Area."""

    st = models.CharField(max_length=2, null=True)
    state = models.ForeignKey(WeatherStates, related_name="counties", null=True, on_delete=models.SET_NULL)
    countyname = models.TextField(null=True)
    countyfips = models.CharField(max_length=5, unique=True, db_index=True)
    timezone = models.TextField(null=True)
    dst = models.BooleanField(null=True)
    shape = models.GeometryField()
    cwas = models.ManyToManyField(WeatherCountyWarningAreas)
    primarywfo = models.ForeignKey(WeatherCountyWarningAreas, related_name="primary_counties", on_delete=models.CASCADE)

    @property
    def subdivision_name(self):
        """Get the localized name for this county-like subdivision.

        Specifically, in Louisiana they are called Parishes and in Alaska, they
        are boroughs or census areas.
        """
        subdivision_mapping = {
            # Most of Alaska is not incorporated into a second-order political
            # subdivision. The FIPS subdivisions of those parts correspond to
            # Census Areas.
            "AK": _("spatial.county-like.name.census-area.01"),
            # American Samoa FIPS area name are fully-qualified.
            "AS": None,
            # In Guam, county-likes are called villages.
            "GU": _("spatial.county-like.name.village.01"),
            # In Louisiana, county-likes are called parishes.
            "LA": _("spatial.county-like.name.parish.01"),
            # In the Northern Mariana Islands and Puerto Rico, county-likes are
            # called municipalities.
            "MP": _("spatial.county-like.name.municipality.01"),
            "PR": _("spatial.county-like.name.municipality.01"),
            # In the US Virgin Islands, FIPS areas refer to islands.
            "VI": _("spatial.county-like.name.island.01"),
        }

        # Alaska has 19 incorporated boroughs. These are not just census areas.
        ak_boroughs = [
            "02013",
            "02020",
            "02060",
            "02068",
            "02090",
            "02100",
            "02110",
            "02122",
            "02130",
            "02150",
            "02164",
            "02170",
            "02185",
            "02188",
            "02195",
            "02220",
            "02230",
            "02275",
            "02282",
        ]

        # If this is one of the incorporated boroughs of Alaska, use the word
        # "borough"
        if self.st == "AK" and self.countyfips in ak_boroughs:
            return _("spatial.county-like.name.borough.01")

        # If we have a specific mapping to a subdivision name, use that. If not,
        # then we use the US default name, "county." :)
        return (
            subdivision_mapping[self.st]
            if self.st in subdivision_mapping
            else _(
                "spatial.county-like.name.county.01",
            )
        )

    @property
    def label(self):
        """Get the full localized name for this country."""
        subdivision = self.subdivision_name
        if subdivision:
            return format_lazy(
                _("spatial.county-like.with-subdivision.label.01"),
                name=self.countyname,
                subdivision=subdivision,
                state=self.st,
            )
        return format_lazy(
            _("spatial.county-like.with-no-subdivision.label.01"),
            name=self.countyname,
            state=self.st,
        )

    def __str__(self):
        return f"{self.countyname}, {self.state} FIPS {self.countyfips}"

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_counties"


class WeatherAlertsCache(models.Model):
    """Represents a processed alert."""

    hash = models.TextField()
    alertjson = JSONField()
    counties = JSONField()
    states = JSONField()
    shape = models.GeometryField(null=True)
    shape_simplified = models.GeometryField(null=True)
    alertkind = models.TextField(null=True, default=None)

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_alerts_cache"


class ForecastGridPoints(models.Model):
    """Individual NDFD Forecast Grid Points."""

    x = models.IntegerField()
    y = models.IntegerField()
    wfo = models.CharField(max_length=3, null=False)
    shape = models.GeometryField(null=False)

    class Meta:  # noqa: D106
        db_table = "weathergov_ndfd_gridpoints"
        unique_together = ("x", "y", "wfo")


class ForecastGridLog(models.Model):
    """Logs occurrences or counts of specific grid points over time."""

    # Linking to the main table
    grid_point = models.ForeignKey(
        "ForecastGridPoints",
        on_delete=models.PROTECT,  # Prevent deletion of grid record when log is deleted
        related_name="logs",
    )

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:  # noqa: D106
        db_table = "weathergov_ndfd_grid_logs"
        ordering = ["-timestamp"]


class ForecastGridHeatIndex(models.Model):
    """Stores aggregated traffic hotspots for dynamic cache expansion."""

    interval_start = models.DateTimeField(db_index=True)
    wfo = models.CharField(max_length=3)
    x = models.IntegerField()
    y = models.IntegerField()

    hit_count = models.IntegerField()
    relative_heat = models.FloatField()
    cache_radius = models.IntegerField()

    class Meta:  # noqa: D106
        db_table = "weathergov_ndfd_grid_index"
        unique_together = ("interval_start", "wfo", "x", "y")
        ordering = ["-interval_start"]
