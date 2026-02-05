import os

from django.core.management.base import BaseCommand

from spatial.management.commands._spatial_util import cache_path, clean_cache
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

    def version_1(self, load_options):
        """Load version 1 of spatial data."""
        force = load_options["force"]
        if load_options["states"] or load_options["all"]:
            load_states(force=force)
        if load_options["cwas"] or load_options["all"]:
            load_cwas(force=force)
        if load_options["counties"] or load_options["all"]:
            load_counties(force=force)
        if load_options["zones"] or load_options["all"]:
            load_zones(force=force)
        if load_options["places"] or load_options["all"]:
            load_places(force=force)

        # Cleanup the cache, if requested.
        if load_options["cleanup"]:
            clean_cache()

    def add_arguments(self, parser):
        """Define arguments for the management command."""
        parser.add_argument(
            "--states",
            action="store_true",
            dest="states",
            default=False,
            help="Add states",
        )
        parser.add_argument(
            "--cwas",
            action="store_true",
            dest="cwas",
            default=False,
            help="Add CWAs/WFOs",
        )
        parser.add_argument(
            "--zones",
            action="store_true",
            dest="zones",
            default=False,
            help="Add forecast, fire, and marine zones",
        )
        parser.add_argument(
            "--counties",
            action="store_true",
            dest="counties",
            default=False,
            help="Add counties",
        )
        parser.add_argument(
            "--places",
            action="store_true",
            dest="places",
            default=False,
            help="Add places",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            dest="force",
            default=False,
            help="Add everything",
        )
        parser.add_argument(
            "--cleanup",
            action="store_true",
            dest="cleanup",
            default=False,
            help="Cleanup caches after loading data",
        )

    def handle(self, *args, **options):
        """Handle the loadspatial management command."""
        load = {
            "states": options["states"],
            "cwas": options["cwas"],
            "zones": options["zones"],
            "counties": options["counties"],
            "places": options["places"],
            "all": not options["states"]
            and not options["cwas"]
            and not options["zones"]
            and not options["counties"]
            and not options["places"],
            "force": options["force"],
            "cleanup": options["cleanup"],
        }

        os.makedirs(cache_path, exist_ok=True)

        self.version_1(load)
