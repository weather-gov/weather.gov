import json

from django.db import connection, models
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.fields import RichTextField


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
            ]
        ),
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


class GeographicPlace:
    """
    A thing that looks model-like, but is not managed by Django and requires
    some raw SQL queries in order to handle correctly.
    """

    def __init__(self):
        self.name = None
        self.state = None
        self.state_name = None
        self.state_fips = None
        self.county = None
        self.county_fips = None
        self.timezone = None
        self.latitude = None
        self.longitude = None

    @staticmethod
    def get_known_place(state, place):
        """
        For a state and place name, see if we have a corresponding
        place. If we do, then create the "model" object and return
        it.
        """

        # De-normalize the place name. For the purposes of clean URLs, we
        # replace spaces with underscores and slahes with commas in place names.
        # There are no places with underscores or commas in their names as of
        # the time of this comment. We need the de-normalized name in order to
        # our query.
        place = place.replace("_", " ").replace(",", "/")

        with connection.cursor() as cursor:
            # Query all the columns of the places table, but for the geometry,
            # query it as a GeoJSON string so Django can handle it.
            cursor.execute(
                """
                SELECT
                  name,
                  state,
                  statename,
                  statefips,
                  county,
                  countyfips,
                  timezone,
                  ST_AsGeoJSON(point)
                FROM weathergov_geo_places
                WHERE state ILIKE %s AND name ILIKE %s
                """,
                [state, place],
            )
            row = cursor.fetchone()

        if row != None:
            model = GeographicPlace()
            model.name = row[0]
            model.state = row[1]
            model.state_name = row[2]
            model.state_fips = row[3]
            model.county = row[4]
            model.county_fips = row[5]
            model.timezone = row[6]

            # Parse the GeoJSON and pull out the lat/lon.
            geojson = json.loads(row[7])
            model.longitude = geojson["coordinates"][0]
            model.latitude = geojson["coordinates"][1]
            return model

        return None
