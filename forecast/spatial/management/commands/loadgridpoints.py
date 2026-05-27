import csv
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from spatial.models import WeatherCountyWarningAreas

ADDITIONAL_CWAS = [
    "AER",
    "ALU"
]

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
            # Make sure that the zones table is not empty
            cursor.execute("SELECT COUNT(*) FROM weathergov_geo_zones;")
            zone_count = [row[0] for row in cursor][0]
            if zone_count == 0:
                raise CommandError("Zones table is empty!") # noqa: TRY003

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
            cursor.execute("TRUNCATE TABLE weathergov_geo_gridpoints RESTART IDENTITY;")

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

            # Drop false CWAs that might be in the data
            self.drop_ignored_cwas()

            # Drop the non-US gridpoints
            self.drop_non_us_gridpoints()

    def drop_ignored_cwas(self):
        """Drop an gridpoints with CWAs we ignore."""
        known_cwas = WeatherCountyWarningAreas.objects.all().values_list("cwa")
        known_cwas = [entry[0] for entry in known_cwas]

        # Add the regional CWAs that are not in our existing
        # CWAs table. These include the CWAs for Alaska
        known_cwas = known_cwas + ADDITIONAL_CWAS

        with connection.cursor() as cursor:
            diff_query = """
            SELECT DISTINCT cwa FROM weathergov_geo_gridpoints
            WHERE NOT (cwa = ANY(%s))
            """
            query = """
            DELETE FROM weathergov_geo_gridpoints
            WHERE NOT (cwa = ANY(%s))
            """
            cursor.execute(diff_query, [known_cwas])
            diff_cwas = [row[0] for row in cursor]
            self.stdout.write(f"Dropping gridpoints from CWAs we don't know about: {diff_cwas}")
            cursor.execute(query, [known_cwas])
            self.stdout.write(f"Dropped {cursor.rowcount} gridpoints from unknown CWAs")


    def drop_non_us_gridpoints(self):
        """
        Drop all gridpoints that are not in the US.

        Gridpoints overlap national borders in certain places, as
        a kind of 'bleed' (if you're familiar with print layout design).
        We need to exclude any gridpoints that are not in the US.
        We do this by cross referencing each point with the existing
        forecast zones that we have.
        """
        with connection.cursor() as cursor:
            self.stdout.write("Removing non-US gridpoints (this might take a few minutes)")
            cursor.execute("""
            DELETE FROM weathergov_geo_gridpoints AS g
            WHERE NOT EXISTS
            (SELECT 1 FROM weathergov_geo_zones AS z
             WHERE ST_Contains(z.shape, g.point) LIMIT 1);
            """)
            self.stdout.write(f"Removed {cursor.rowcount} gridpoints that were not in the US")


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
