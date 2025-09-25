import os

from django.core.management.base import BaseCommand

from spatial.management.commands._spatial_util import cache_path
from spatial.management.commands.v1.data import (
    load_counties,
    load_cwas,
    load_places,
    load_states,
    load_zones,
)


class Command(BaseCommand):
    """loadspatial management command."""

    help = "Loads spatial data"

    def version_1(self):
        """Load version 1 of spatial data."""
        load_states()
        load_cwas()
        load_counties()
        load_zones()
        load_places()

    def handle(self, *args, **options):
        """Handle the loadspatial management command."""
        os.makedirs(cache_path, exist_ok=True)

        self.version_1()
