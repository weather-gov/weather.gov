import csv
import os
import re

from django.contrib.gis.gdal import DataSource
from django.contrib.gis.geos import GEOSGeometry
from tqdm import tqdm

from spatial.management.commands._spatial_util import (
    SHAPE_TZ_TO_IANA,
    US_CODES,
    cache_path,
    download_to_cache,
    load_from_shapefile,
    unzip_cache,
)
from spatial.models import (
    WeatherCounties,
    WeatherCountyWarningAreas,
    WeatherPlace,
    WeatherStates,
    WeatherZone,
)

# We do in fact want print statements in this file, unless/until we have a
# better logging approach.
# ruff: noqa: T201

# There are some places in the cities500 dataset that shouldn't be
# there, like that one Hardee's in Los Angeles.
__bad_places = [
    "Firing Range, GA",
    "Sugarcreek Police Dept, OH",
    "Washington Street Courthouse Annex, AL",
    "Carls Jr, CA",
]


def load_states():
    """Load state data."""
    print("loading states")

    # Start by emptying the table
    WeatherStates.objects.all().delete()

    # States are easy because they're 100% from shapefile
    load_from_shapefile(
        model=WeatherStates,
        url="https://www.weather.gov/source/gis/Shapefiles/County/s_18mr25.zip",
        shapefile_mapping={
            "state": "STATE",
            "name": "NAME",
            "fips": "FIPS",
            "shape": "POLYGON",
        },
    )
    print(
        "loaded " + str(WeatherStates.objects.count()) + " states",
    )


def load_cwas():
    """Load county warning area data."""
    print("loading CWAs")
    WeatherCountyWarningAreas.objects.all().delete()
    load_from_shapefile(
        model=WeatherCountyWarningAreas,
        url="https://www.weather.gov/source/gis/Shapefiles/WSOM/w_18mr25.zip",
        shapefile_mapping={
            "wfo": "WFO",
            "cwa": "CWA",
            "region": "REGION",
            "city": "CITY",
            "shape": "POLYGON",
        },
    )
    print(
        "loaded " + str(WeatherCountyWarningAreas.objects.count()) + " CWAs",
    )


def load_counties():
    """Load county data."""
    print("loading counties")
    WeatherCounties.objects.all().delete()
    load_from_shapefile(
        model=WeatherCounties,
        url="https://www.weather.gov/source/gis/Shapefiles/County/c_18mr25.zip",
        shapefile_mapping={
            "countyname": "COUNTYNAME",
            "countyfips": "FIPS",
            "cwastring": "CWA",
            "st": "STATE",
            "timezone": "TIME_ZONE",
            "shape": "POLYGON",
        },
    )
    # Counties are linked to states and CWAs, so add those. We also need to
    # transform the 1-letter NWS timezone abbreviation into IANA zone names
    for county in WeatherCounties.objects.all():
        county.state = WeatherStates.objects.get(state=county.st)

        cwas = [
            county.cwastring[y - 3 : y] for y in range(3, len(county.cwastring) + 3, 3)
        ]
        for cwa in cwas:
            county.cwas.add(WeatherCountyWarningAreas.objects.get(cwa=cwa))

        # The shapefile indicates whether a county observes DST by
        # capitalizing the timezone code.
        county.dst = county.timezone == county.timezone.upper()
        county.timezone = SHAPE_TZ_TO_IANA[county.timezone[:1].upper()]

        county.save()
    print(
        "loaded " + str(WeatherCounties.objects.count()) + " counties",
    )


def __insert_zones_into_database(zones):
    print("...putting them in the database")
    for id, zone in tqdm(iterable=zones.items(), ncols=50, leave=False):
        # If there's only one geometry in the zone, use it. Otherwise smoosh
        # them all together intoa  GeometryCollection object.
        geometry = (
            zone["geometry"][0]
            if len(zone["geometry"]) == 1
            # If we're smooshing them together, just go ahead and make it a
            # GeoJSON string.
            else (
                '{"type":"GeometryCollection","geometries":['
                + ",".join(zone["geometry"])
                + "]}"
            )
        )

        # Put that stuff in the database.
        wz = WeatherZone(
            id=id,
            state=zone["state"],
            type=zone["type"],
            shape=GEOSGeometry(geometry),
        )
        wz.save()


def __load_forecast_and_fire_zones():
    for type, url in [
        ["forecast", "https://www.weather.gov/source/gis/Shapefiles/WSOM/z_18mr25.zip"],
        ["fire", "https://www.weather.gov/source/gis/Shapefiles/WSOM/fz18mr25.zip"],
    ]:
        path = download_to_cache(url)
        unzip_cache(os.path.basename(path))
        known = {}

        ds = DataSource(re.sub(r"\.zip$", ".shp", path))

        print("...reading " + type + " zones")
        for feature in tqdm(iterable=ds[0], ncols=50, leave=False):
            state = feature.get("STATE")

            # Build up the globally-unique zone ID. This URI should match the
            # zone IDs returned by the API.
            id = (
                "https://api.weather.gov/zones/"
                + type
                + "/"
                + state
                + "Z"
                + feature.get("ZONE")
            )
            geometry = feature.geom.json

            # Some of the zones are represented by multiple polygons. To handle
            # that, we'll gather a list of all polygons and insert them into the
            # database as a geometry collection.
            if id in known:
                known[id]["geometry"].append(geometry)
            else:
                known[id] = {
                    "id": id,
                    "state": state,
                    "type": type,
                    "geometry": [geometry],
                }

        __insert_zones_into_database(known)


def __load_marine_zones():
    for type, url in [
        [
            "marine:coastal",
            "https://www.weather.gov/source/gis/Shapefiles/WSOM/mz18mr25.zip",
        ],
        [
            "marine:offshore",
            "https://www.weather.gov/source/gis/Shapefiles/WSOM/oz18mr25.zip",
        ],
    ]:
        path = download_to_cache(url)
        unzip_cache(os.path.basename(path))
        known = {}

        ds = DataSource(re.sub(r"\.zip$", ".shp", path))

        print("...reading " + type + " zones")
        for feature in tqdm(iterable=ds[0], ncols=50, leave=False):
            # Unlike forecast zones, marine zones have fully-qualified IDs, so
            # we just boop the URL part right on the front. The API uses
            # "forecast" in the path so we do too.
            id = "https://api.weather.gov/zones/forecast/" + feature.get("ID")
            geometry = feature.geom.json

            # Some of the zones are represented by multiple polygons. To handle
            # that, we'll gather a list of all polygons and insert them into the
            # database as a geometry collection.
            if id in known:
                known[id]["geometry"].append(geometry)
            else:
                known[id] = {
                    "id": id,
                    "state": None,
                    "type": type,
                    "geometry": [geometry],
                }

        __insert_zones_into_database(known)


def load_zones():
    """Load zone data."""
    print("loading zones")
    WeatherZone.objects.all().delete()

    # We can't just use the load_from_shapefile tool for zones because their IDs
    # are not globally unique; they are only unique within the context of their
    # zone type and the state they are situated inside. If we use
    # load_from_shapefile, the uniqueness constraint on the model ID will cause
    # later zones to overwrite earlier ones.
    #
    # So... we do a little custom dancing.
    __load_forecast_and_fire_zones()
    __load_marine_zones()

    print("loaded " + str(WeatherZone.objects.count()) + " zones")


def __is_invalid_place(place):
    return (
        place["country"] not in US_CODES
        or not place["code"].startswith("PPL")
        or (place["name"] + ", " + place["state"]) in __bad_places
    )


def __get_county_fips(place):
    # We only use the county code from the cities500 dataset if it's a US state.
    # Otherwise the county codes are *NOT* FIPS codes and we can't use them.
    if place["country"] == "US":
        # Naturally, it's still not that simple. 50% of Alaska's land
        # area is not in a borough ("county") at all. Alaska is unique
        # in that it is not entirely subdivided that way. Anyway, that's
        # just a fun fact. The citites500 dataset uses FIPS county code
        # 270 for some places in Alaska. That code previously referred
        # to the "Wade Hampton Census Area," but in 2015 it was renamed
        # (and re-numbered, apparently) to the Kusilvak Census Area
        # because Hampton was a slaver. Instead, the new name comes from
        # the highest mountain range in the census area. But for our
        # purposes, the cities500 dataset uses FIPS code 270 but it is
        # now FIPS code 158, so we need to tweak it.
        if place["state"] == "AK" and place["county"] == "270":
            return "158"
        return place["county"]

    # American Samoa has 15 actual counties contained within 5
    # FIPS counties. These three cities in particular for some
    # reason fail the spatial query below, but we know their
    # actual counties, so we can translate those into th FIPS
    # counties that contain them.
    #
    # https://en.wikipedia.org/wiki/Administrative_divisions_of_American_Samoa
    #
    # Eg, Alao is in Vaifanua County, which is in the Eastern
    # FIPS county, whose code is 60010. Since these 3 cities
    # don't match our queries, we'll handle them specially.
    if place["country"] == "AS":
        if place["name"] == "Alao" or place["name"] == "Leloaloa":
            return "60010"
        if place["name"] == "Taulaga":
            return "60040"

    # For all other cases where we don't have a valid county FIPS,
    # find the county that contains this place's point and use the
    # associated state and FIPS code values.
    wkt = "POINT(" + place["lon"] + " " + place["lat"] + ")"
    county = WeatherCounties.objects.filter(shape__contains=wkt).first()
    if county is not None:
        return county.countyfips

    # We ought not reach this point, but just in case we do, flag it bigly.
    print("========= NO COUNTY FOUND =========")
    print(place)
    return None


def load_places():
    """Load place data."""
    print("loading places")
    WeatherPlace.objects.all().delete()

    unzip_cache("us.cities500.txt.zip")

    # For convenience, get the line count of the file so we can have a pretty
    # status bar as we go along.
    with open(cache_path + "us.cities500.txt", "rb") as f:
        lines = sum(1 for _ in f)

    csvfile = open(cache_path + "us.cities500.txt", "r")
    reader = csv.DictReader(
        csvfile,
        # These are the names of the fields in the cities500 dataset. Naming
        # them here makes it much more ergonomic to refer to them later.
        # The ones set to "undefined" are ones we don't care about or that
        # don't matter to us.
        fieldnames=[
            "undefined",
            "name",
            "undefined",
            "undefined",
            "lat",
            "lon",
            "class",
            "code",
            "country",
            "undefined",
            "state",
            "county",
            "undefined",
            "undefined",
            "undefined",
            "undefined",
            "undefined",
            "timezone",
        ],
        delimiter="\t",
    )

    for csv_place in tqdm(iterable=reader, total=lines, ncols=50, leave=False):
        # If not a US or populated place, skip it
        if __is_invalid_place(csv_place):
            continue

        place = WeatherPlace()
        place.name = csv_place["name"]
        place.timezone = csv_place["timezone"]
        place.countyfips = __get_county_fips(csv_place)

        # For states, the "state" field is the two-letter abbreviation.
        # For everywhere else, it's a numeric code, but it turns out in
        # those cases, the country code is the appropriate "state"
        # abbreviation, so use that.
        place.state = (
            csv_place["state"] if csv_place["country"] == "US" else csv_place["country"]
        )

        # Create a WKT string in order to create the geometry. We may
        # also use this WKT string for a county lookup later on.
        wkt = "POINT(" + csv_place["lon"] + " " + csv_place["lat"] + ")"
        place.point = GEOSGeometry(wkt)

        # And finally grab the state and county names
        county = WeatherCounties.objects.filter(
            countyfips__endswith=place.countyfips,
            state__state=place.state,
        ).first()
        if county is not None:
            place.county = county.countyname
            place.countyfips = county.countyfips
            place.statename = county.state.name
            place.statefips = county.state.fips
        else:
            print(
                "couldn't get county for FIPS "
                + place.countyfips
                + " ("
                + place.state
                + ")",
            )

        place.save()

    csvfile.close()
    print(
        "loaded " + str(WeatherPlace.objects.count()) + " places",
    )
