from django.contrib.gis.db import models

# Create your models here.


class WeatherZone(models.Model):
    id = models.CharField(max_length=45, primary_key=True)
    state = models.CharField(max_length=2, null=True)
    shape = models.GeometryField()

    class Meta:
        db_table = "weathergov_geo_zones_dj"


class WeatherPlace(models.Model):
    name = models.TextField(null=True)
    state = models.TextField(null=True)
    statename = models.TextField(null=True)
    statefips = models.CharField(max_length=2, null=True)
    county = models.TextField(null=True)
    countyfips = models.CharField(max_length=5, null=True)
    timezone = models.TextField(null=True)
    point = models.PointField()

    class Meta:
        db_table = "weathergov_geo_places_dj"


class WeatherCounties(models.Model):
    state = models.CharField(max_length=2, null=True)
    statename = models.TextField(null=True)
    statefips = models.CharField(max_length=2, null=True)
    countyname = models.TextField(null=True)
    countyfips = models.CharField(max_length=5, null=True)
    timezone = models.TextField(null=True)
    dst = models.BooleanField(null=True)
    shape = models.GeometryField()
    cwas = models.TextField(null=True)

    class Meta:
        db_table = "weathergov_geo_counties_dj"


class WeatherStates(models.Model):
    state = models.CharField(max_length=2, null=True)
    name = models.TextField(null=True)
    fips = models.CharField(max_length=2, null=True)
    shape = models.GeometryField()

    class Meta:
        db_table = "weathergov_geo_states_dj"


class WeatherCountyWarningAreas(models.Model):
    wfo = models.CharField(max_length=3, null=True)
    cwa = models.CharField(max_length=3, null=True)
    region = models.CharField(max_length=2, null=True)
    city = models.CharField(max_length=50, null=True)
    state = models.CharField(max_length=50, null=True)
    st = models.CharField(max_length=2, null=True)
    shape = models.GeometryField()

    class Meta:
        db_table = "weathergov_geo_cwas_dj"


class WeatherAlertsCache(models.Model):
    hash = models.TextField()
    alertjson = models.TextField()
    shape = models.GeometryField(null=True)
    alertkind = models.TextField(null=True, default=None)

    class Meta:
        db_table = "weathergov_geo_alerts_cache_dj"
