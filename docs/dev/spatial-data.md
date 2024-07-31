# Spatial data

We store certain geospatial data in our own database and use it for some basic
geospatial queries. In order for the site to work correctly locally, the data
needs to be loaded first. Most of the spatial data comes from NOAA's
[AWIPS basemap shapefiles](https://www.weather.gov/gis/AWIPSShapefiles). We also
use placename information from Geonames, preprocessed to remove non-US places.
The Geonames data is stored in our repository.

1. Ensure your Docker containers are already running. The script to load spatial
   data expects our database container to be available

   ```
   docker compose up -d
   ```

2. Load the spatial data into your local database by running
   ```sh
   make load-spatial
   ```
   This will download shapefiles from NOAA, as necessary. You do not need to
   manually download anything.

## Loading data into cloud environments

Log into cloud.gov:

```sh
 cf login --sso -a api.fr.cloud.gov
```

And then run this utility script, indicating which environment you want to load
data into.

```sh
./scripts/load-spatial-data.sh <environment>
```

## Updating geospatial tables

Our geospatial data is managed by a set of utility scripts in the `spatial-data`
directory at the root of the project. Each spatial data source is represented by
a Javascript file in the `spatial-data/sources` directory. This Javascript file
includes code for creating and updating schema versions as well as code for
loading the actual data into the database.

A sources script file should export an object that looks roughly like this:

```js
  table: <string>,
   schemas: {
      <version | int>: async function() <bool> {},
      <version | int>: async function() <bool> {},
   },
   loadData: async function() {}
```

The `table` property is the name of the table used by the source.

The `schemas` property is an object whose keys are integers representing schema
versions. The keys are used to determine the list of schema upgrades necessary
for a given table. The values are functions that are called if a given schema
upgrade is necessary. A schema upgrade function should return `true` if the
source data needs to be reloaded or `false` if only a schema change is
necessary. If there is an update that _only_ requires reloading data, there
should be still be an new version created in the `schemas` property, but its
function should simply return `true`.

The `loadData` function is called if any necessary schema upgrades also need
data to be loaded/reloaded. The `loadData` should assume that the schema is the
most recent version and should not need to do any schema consistency checks.
