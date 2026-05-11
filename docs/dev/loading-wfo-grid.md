This guide outlines the process for converting NWS Grid Points from GeoJSON to CSV and importing them into the `weathergov_geo_gridpoints` table. This method leverages the `psql` client-side streaming capability, avoiding the need for FTP or direct file pushes to Cloud Foundry instances.

## Prerequisites

- **Docker**: Required for the GDAL/OGR conversion tool.
- **CF CLI**: With the `connect-to-service` plugin installed.
- **gridpoints.json**: The source GeoJSON file.

---

## 1. Convert GeoJSON to CSV
We use Docker to run `ogr2ogr`. This transforms the nested GeoJSON properties into a flat CSV and extracts the geometry into explicit `X` (Longitude) and `Y` (Latitude) columns.

```bash
docker run --rm -v "$(pwd):/data" osgeo/gdal:alpine-small-3.6.3 \
  ogr2ogr -f CSV /data/gridpoints.csv /data/gridpoints.json \
  -lco GEOMETRY=AS_XY \
  -sql "SELECT cwa, gridX AS x, gridY AS y FROM \"gridpoints\""
```

## 2. Connect to the Database
Authenticate with Cloud Foundry and open a secure tunnel to a selected environmental RDS instance.

```bash
cf login --sso
cf connect-to-service weathergov-<environment> weathergov-rds-<environment>
```

## 3. The Import Process

Once connected to the psql prompt, execute the following steps in order.

> Note: Do not close your session until Step 3.3 is complete. Temporary tables (TEMP) are automatically dropped when you disconnect.

### 3.1 Create Temporary Staging Table
This creates an in-memory "workbench" to hold the raw CSV data.

```sql
CREATE TEMP TABLE temp_grid (
    raw_lon TEXT,
    raw_lat TEXT,
    raw_cwa TEXT,
    raw_x TEXT,
    raw_y TEXT
);
```

### 3.2 Stream Local CSV to Remote Server
The `\copy` command is a meta-command that tells your local client to read the file and stream it into the database.

```sql
\copy temp_grid FROM 'gridpoints.csv' WITH CSV HEADER
```

### 3.3 Transform and Move to Production
This is the final step. It converts the raw text into the proper database types, capitalizes the CWA (WFO), and generates the PostGIS binary geometry.

```sql
INSERT INTO weathergov_geo_gridpoints (cwa, x, y, point)
SELECT
    UPPER(raw_cwa),
    raw_x::integer,
    raw_y::integer,
    ST_SetSRID(ST_Point(raw_lon::float, raw_lat::float), 4326)
FROM temp_grid;
```

### 3.4 Optimization
Update the database statistics to ensure spatial index performance.
```sql
VACUUM ANALYZE weathergov_geo_gridpoints;
```

### 4. Verification
Run a test query to ensure coordinates and WFOs are correctly formatted.

```sql
SELECT cwa, x, y, ST_AsText(point)
FROM weathergov_geo_gridpoints
WHERE cwa = 'ABR'
LIMIT 5;
```
