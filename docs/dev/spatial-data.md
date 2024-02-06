# Spatial data

We store certain geospatial data in our own database and use it for some basic
geospatial queries. In order for the site to work correctly locally, the data
needs to be loaded first. At the moment, you will need to fetch two shapefiles
from NWS and the Cities500 dataset from geonames.

1. Download the U.S. Counties and U.S. States and Territories shapeiles from the
   [NWS AWIPS basemap shapefiles](https://www.weather.gov/gis/AWIPSShapefiles).
   Unzip them and place them in the project root directory.

   > [!NOTE]  
   > Our loading script expects specific filenames for these shapefiles. If the
   > c_05mr24.zip and s_05mr24.zip downloads are available, they will already
   > be named correctly.

   > [!CAUTION]  
   > Don't delete any of the files from the zip. You will need the .dbf, .prj,
   > .shp, and .shx files. A shapefile is actually a collection of files.

2. Download the cities500.zip from the
   [Geonames archive](https://download.geonames.org/export/dump/). Unzip and
   place into the project root directory.

3. Run `node load-shapefiles.js`

## Loading data into cloud environments

Ensure you have the shapefiles and cities500 dataset downloaded to your project
root directory as described above. Log into cloud.gov:

```sh
 cf login --sso -a api.fr.cloud.gov
```

And then run this utility script, indicating which environment you want to load
data into.

```sh
./scripts/load-spatial-data.sh <environment>
```
