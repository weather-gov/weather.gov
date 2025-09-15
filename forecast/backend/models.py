import json

from django.db import connection, models
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.fields import RichTextField


class Region(ClusterableModel):
    """
    Represents a Region.

    A region is one of the subdivisions of the
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
    Represents a Weather Forecast Office (WFO).

    A WFO is the primary unit in the NWS in which forecasts are generated.
    These constitute the actual NWS offices.
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
            ],
        ),
    ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def has_social(self):
        """Has FaceBook, Twitter, or YouTube."""
        return bool(self.facebook or self.twitter or self.youtube)

    @property
    def has_first_pane(self):
        """Has phone, address, or email."""
        return bool(self.phone or self.address or self.email)

    @property
    def has_contact(self):
        """Has social media, address, or email."""
        return bool(self.has_social or self.address or self.email)


class DynamicSafetyInformation(models.Model):
    """
    Represents Hazard/Alert types matched to specific safety tips recommended by the NWS.

    These tips will be displayed alongside alert information, where available
    """

    type = models.CharField(unique=True, max_length=256)
    label = models.CharField(max_length=256)
    body = models.TextField()

    # Panels for Wagtail admin
    panels = [FieldPanel("type"), FieldPanel("label"), FieldPanel("body")]

    def __str__(self):
        return self.type

class GeographicPlace:
    """
    A pseudo-model that fetches data (including the lat/lon) of a given state and place name.

    NB: this class uses raw SQL queries and does not expose any Django model methods.
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
        Create an instance of GeographicPlace for a given state and place.

        Returns:
            GeographicPlace if one exists for (state,place) else None
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

        if row is not None:
            _cls = GeographicPlace()
            _cls.name = row[0]
            _cls.state = row[1]
            _cls.state_name = row[2]
            _cls.state_fips = row[3]
            _cls.county = row[4]
            _cls.county_fips = row[5]
            _cls.timezone = row[6]

            # Parse the GeoJSON and pull out the lat/lon.
            geojson = json.loads(row[7])
            _cls.longitude = geojson["coordinates"][0]
            _cls.latitude = geojson["coordinates"][1]
            return _cls

        return None
