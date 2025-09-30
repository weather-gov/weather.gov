from django.contrib.gis.db import models
from django.db.models import JSONField


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
    state = models.ForeignKey(WeatherStates, null=True, on_delete=models.SET_NULL)
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
