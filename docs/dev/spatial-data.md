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
