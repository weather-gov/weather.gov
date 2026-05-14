import csv
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    """loadgridpoints management command."""

    help="Loads WFO gridpoints data into the database from a file.\
    Requires loadspatial and migrations have already been run."

    def add_arguments(self, parser):
        """Define arguments for the management command."""
        parser.add_argument(
            "source_file",
            type=str,
            help="Path to gridpoints source data file (CSV format)"
        )

    def handle(self, *args, **options):
        """Handle the loadgridpoints management command."""
        self.ensure_source_file(options["source_file"])
        self.stream_data_to_table(options["source_file"])
        self.update_gridpoints_with_marine_columns()
        self.stdout.write("Gridpoints loaded and processed!")

    def ensure_source_file(self, source_file_path):
        """Raise an exception if the file doesn't exist."""
        if not os.path.isfile(source_file_path):
            raise CommandError(f"Source file {source_file_path} does not appear to exist!") # noqa: TRY003

    def stream_data_to_table(self, source_file_path):
        """Load gridpoints data from the CSV file into the database."""
        with connection.cursor() as cursor:
            # Creating a temp table makes an
            # in-memory 'workbench' to hold the raw
            # CSV data
            self.stdout.write("Creating temp table")
            cursor.execute("""
            CREATE TEMP TABLE temp_grid (
            raw_lon TEXT,
            raw_lat TEXT,
            raw_cwa TEXT,
            raw_x TEXT,
            raw_y TEXT
            );""")

            self.stdout.write(f"Loading from {source_file_path}")
            # Stream from the local CSV into the database
            with open(source_file_path, "r") as csvfile:
                source_reader = csv.reader(csvfile)
                with cursor.copy("COPY temp_grid FROM STDIN") as copy:
                    next(source_reader) # ignore the header
                    for row in source_reader:
                        copy.write_row(row)
            self.stdout.write("Successfully loaded temp tables from csv")

            # Truncate the existing table
            self.stdout.write("Truncating existing weathergov_geo_gridpoints")
            cursor.execute("TRUNCATE TABLE weathergov_geo_gridpoints")

            # Transform and move to production.
            # This converts the raw text into the proper database types,
            # capitalizes the CWA, and generates the PostGIS binary
            # geometry
            self.stdout.write("Inserting and formatting from temp tables")
            cursor.execute("""
            INSERT INTO weathergov_geo_gridpoints (cwa, x, y, point)
            SELECT
                UPPER(raw_cwa),
                raw_x::integer,
                raw_y::integer,
                ST_SetSRID(ST_Point(raw_lon::float, raw_lat::float), 4326)
            FROM temp_grid;""")

            self.stdout.write("Optimizing table")
            # Optimize the db statistics to ensure spatial index performance
            cursor.execute("VACUUM ANALYZE weathergov_geo_gridpoints;")

    def update_gridpoints_with_marine_columns(self):
        """
        Update the gridpoints table to have correct data about marine.

        This method will cross-reference the existing zones table and update
        the is_marine columns if there is any intersection of the given point.
        """
        with connection.cursor() as cursor:
            self.stdout.write("Updating marine information for gridpoints")
            cursor.execute("""
            UPDATE weathergov_geo_gridpoints AS gridpoints
            SET is_marine=true, type='marine'
            FROM weathergov_geo_zones AS zones
            WHERE
                ST_Contains(zones.shape, gridpoints.point)
                AND
                (zones.type='marine:offshore' OR zones.type='marine:coastal');""")
