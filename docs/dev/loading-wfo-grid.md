# Loading WFO Grid Data

This guide outlines the process for converting NWS Grid Points from GeoJSON to CSV and importing them into the `weathergov_geo_gridpoints` table. This method leverages the `psql` client-side streaming capability, avoiding the need for FTP or direct file pushes to Cloud Foundry instances.

This guide outlines the two-stage process for converting NWS Gridpoints from GeoJSON to CSV, and to inserting this information into the `weathergov_geo_gridpoints` table.
  
It makes use of both a local and manual conversion step (Stage 1) and an automated command that can be run locally or in higher environments (Stage 2)

For the moment, the overall process of converting and uploading gridpoints data to any given environment database (ie, running stages 1 and 2 together) is still a manual process and not handled by CI or postdeploy scripts.

## Prerequisites

- **Docker**: Required for the GDAL/OGR conversion tool.
- **gridpoints.json**: The source GeoJSON file.

---

## Stage 1: Manual, one-time conversion of GeoJSON data into CSV
We use Docker to run `ogr2ogr`. This transforms the nested GeoJSON properties into a flat CSV and extracts the geometry into explicit `X` (Longitude) and `Y` (Latitude) columns.

```bash
docker run --rm -v "$(pwd):/data" osgeo/gdal:alpine-small-3.6.3 \
  ogr2ogr -f CSV /data/gridpoints.csv /data/gridpoints.json \
  -lco GEOMETRY=AS_XY \
  -sql "SELECT cwa, gridX AS x, gridY AS y FROM \"gridpoints\""
```

**Note** that this conversion only needs to be done _once_ per source gridpoints GeoJSON file data, and that the resulting CSV can be stored locally and/or remotely and reused by Stage 2 until the source data needs updating. This means that in we can use the same CSV source file, once generated, to run Stage 2 multiple times in each of the environments we need to populate gridpoints data for.

## Stage 2: Automatic ingestion of csv data into the `weathergov_geo_gridpoints` table, followed by additional processing.
For this stage, we make use of a Django management command:
```python manage.py loadgridpoints <path-to-csv-file>```

**The path to this file assumes the /forecast prefix.** So if you have placed your CSV file in `/forecast/spatial/management/commands/file.csv`, for example, you would run `python manage.py loadgridpoints spatial/management/commands/file.csv`
  
If you are running this in a local dev environment, you can simply:
```
docker compose exec web python manage.py loadgridpoints <path-to-csv-file>
```
where the path represents the container's notion of the path to the csv file.
  
This command will perform the following steps automatically, assuming it can find a valid CSV data file at the given path:
1. Create a temporary staging table
2. Load CSV data into the staging table
3. Reformat columns and insert temp values unto the real gridpoints table
4. Optimize indexing on the table
5. Cross-reference marine zone tables and update `is_marine` and `type` columns to have correct marine values for each gridpoints

