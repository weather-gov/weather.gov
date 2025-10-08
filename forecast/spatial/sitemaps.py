from django.contrib.sitemaps import Sitemap
from django.db.utils import ProgrammingError

from .models import WeatherPlace, WeatherSpatialMetadata


class PlaceSitemap(Sitemap):
    """Defines the sitemap for places."""

    changefreq = "monthly"

    # All places are updated at the same time.
    try:
        lastmod = WeatherSpatialMetadata.objects.get(table=WeatherPlace._meta.db_table).last_updated
    except WeatherSpatialMetadata.DoesNotExist:
        # If we don't have any metadata for the places table, we won't actually
        # have any places either, so we bail out safely.
        lastmod = None
    except ProgrammingError:
        # Nominally this should never happen. However, for whatever reason, the
        # sitemaps are processed during a migration. Read that again and see if
        # makes any sense. No? Okay good, we're on the same page. Anyway, it
        # tries to run the query above BEFORE THE MIGRATIONS. The underlying
        # table doesn't exist yet because it hasn't been created, so we get a
        # ProgrammingError exception. Catch it, so that we can actually do the
        # migration.
        lastmod = None

    def items(self):
        """Items for the sitemap."""
        return WeatherPlace.objects.all()

    def location(self, place):
        """Get the URL for a given place."""
        return "/place/" + place.state + "/" + place.name.replace(" ", "_").replace("/", ",")
