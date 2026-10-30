import csv
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from spatial.models import WeatherCountyWarningAreas

ADDITIONAL_CWAS = [
    "AER",
    "ALU"
]
MARINE_ZONE_TYPES = ["marine:coastal", "marine:offshore"]
LAND_ZONE_TYPES = ["forecast"]
# NDFD grid projections registered in spatial migration 0046
LCC_SRID = 990001
POLAR_STEREOGRAPHIC_SRID = 990002
MERCATOR_SRID = 990003
POLAR_STEREOGRAPHIC_CWAS = ["AFG", "AJK", "AER", "ALU"]
MERCATOR_CWAS = ["HFO", "SJU", "GUM", "PQE", "PQW"]

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
            INSERT INTO weathergov_geo_gridpoints (cwa, x, y, point, is_marine, is_land)
            SELECT
                UPPER(raw_cwa),
                raw_x::integer,
                raw_y::integer,
                ST_SetSRID(ST_Point(raw_lon::float, raw_lat::float), 4326),
                false,
                false
            FROM temp_grid;""")

            self.stdout.write("Optimizing table")
            # Optimize the db statistics to ensure spatial index performance
            cursor.execute("VACUUM ANALYZE weathergov_geo_gridpoints;")

            # Drop false CWAs that might be in the data
            self.drop_ignored_cwas()

            self.update_land_and_marine()

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

    def update_land_and_marine(self):
        """Flag gridpoints whose NDFD cell overlaps marine or land zones."""
        with connection.cursor() as cursor:
            # Small zone pieces keep each intersect test cheap
            cursor.execute("""
            CREATE TEMP TABLE temp_zones AS
            SELECT type, ST_Subdivide(shape, 256) AS shape
            FROM weathergov_geo_zones
            WHERE type = ANY(%s);""", [MARINE_ZONE_TYPES + LAND_ZONE_TYPES])
            cursor.execute("CREATE INDEX temp_zones_shape_idx ON temp_zones USING GIST (shape);")
            cursor.execute("ANALYZE temp_zones;")

            self.stdout.write("Fitting each CWA's grid lattice")
            # Each CWA grid is a regular lattice in its projection, so position = intercept + slope * x (and y)
            cursor.execute("""
            CREATE TEMP TABLE temp_lattices AS
            SELECT
                cwa,
                srid,
                regr_intercept(px, x) AS x0,
                regr_slope(px, x) AS dx,
                regr_intercept(py, y) AS y0,
                regr_slope(py, y) AS dy
            FROM (
                SELECT
                    cwa, x, y, srid,
                    ST_X(ST_Transform(point, srid)) AS px,
                    ST_Y(ST_Transform(point, srid)) AS py
                FROM (
                    SELECT
                        cwa, x, y, point,
                        CASE
                            WHEN cwa = ANY(%s) THEN %s
                            WHEN cwa = ANY(%s) THEN %s
                            ELSE %s
                        END AS srid
                    FROM weathergov_geo_gridpoints
                ) AS g
            ) AS p
            GROUP BY cwa, srid;""", [
                POLAR_STEREOGRAPHIC_CWAS, POLAR_STEREOGRAPHIC_SRID,
                MERCATOR_CWAS, MERCATOR_SRID,
                LCC_SRID,
            ])

            self.stdout.write("Building gridpoint cells")
            # Half a step either side of the lattice point, so neighboring cells share edges
            cursor.execute("""
            CREATE TEMP TABLE temp_cells AS
            SELECT
                g.id,
                ST_Transform(ST_MakeEnvelope(
                    l.x0 + l.dx * (g.x - 0.5),
                    l.y0 + l.dy * (g.y - 0.5),
                    l.x0 + l.dx * (g.x + 0.5),
                    l.y0 + l.dy * (g.y + 0.5),
                    l.srid
                ), 4326) AS shape
            FROM weathergov_geo_gridpoints AS g
            JOIN temp_lattices AS l ON l.cwa = g.cwa;""")
            # Cells straddling the antimeridian come back 360° wide, split them at ±180 instead
            cursor.execute("""
            UPDATE temp_cells
            SET shape = ST_WrapX(ST_ShiftLongitude(shape), 180, -360)
            WHERE ST_XMax(shape) - ST_XMin(shape) > 180;""")
            cursor.execute("CREATE INDEX temp_cells_shape_idx ON temp_cells USING GIST (shape);")
            cursor.execute("ANALYZE temp_cells;")

            self.stdout.write("Updating land and marine information for gridpoints")
            for column, zone_types in (
                ("is_marine", MARINE_ZONE_TYPES),
                ("is_land", LAND_ZONE_TYPES),
            ):
                cursor.execute(
                    f"""
                UPDATE weathergov_geo_gridpoints AS g
                SET {column} = true
                FROM (
                    SELECT DISTINCT c.id
                    FROM temp_cells AS c
                    JOIN temp_zones AS z ON ST_Intersects(z.shape, c.shape)
                    WHERE z.type = ANY(%s)
                ) AS hits
                WHERE g.id = hits.id;""",  # noqa: S608
                    [zone_types],
                )
                self.stdout.write(f"Set {column} on {cursor.rowcount} gridpoints")

            cursor.execute("DROP TABLE temp_zones, temp_lattices, temp_cells;")
            cursor.execute("VACUUM ANALYZE weathergov_geo_gridpoints;")

            cursor.execute("""
            SELECT
                COUNT(*) FILTER (WHERE is_marine AND NOT is_land),
                COUNT(*) FILTER (WHERE is_land AND NOT is_marine),
                COUNT(*) FILTER (WHERE is_land AND is_marine),
                COUNT(*) FILTER (WHERE NOT is_land AND NOT is_marine)
            FROM weathergov_geo_gridpoints;""")
            marine, land, both, neither = cursor.fetchone()
            self.stdout.write(f"Marine only: {marine}, land only: {land}, both: {both}, neither: {neither}")
