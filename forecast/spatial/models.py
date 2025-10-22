from django.contrib.gis.db import models
from django.db.models import JSONField


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
    countyfips = models.CharField(max_length=5, null=True)
    timezone = models.TextField(null=True)
    dst = models.BooleanField(null=True)
    shape = models.GeometryField()
    cwas = models.ManyToManyField(WeatherCountyWarningAreas)
    cwastring = models.TextField(null=True)

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_counties"


class WeatherAlertsCache(models.Model):
    """Represents a processed alert."""

    hash = models.TextField()
    alertjson = JSONField()
    shape = models.GeometryField(null=True)
    alertkind = models.TextField(null=True, default=None)

    class Meta:  # noqa: D106
        db_table = "weathergov_geo_alerts_cache"
