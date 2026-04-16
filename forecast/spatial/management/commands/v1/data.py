import csv
import logging

from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from tqdm import tqdm

from spatial.management.commands._spatial_util import (
    COUNTY_FIPS_TO_PRIMARY_WFO_MAP,
    SHAPE_TZ_TO_IANA,
    US_CODES,
    cache_path,
    get_shapefile,
    unzip_cache,
)
from spatial.models import (
    WeatherCounties,
    WeatherCountyWarningAreas,
    WeatherPlace,
    WeatherSpatialMetadata,
    WeatherStates,
    WeatherZone,
)

logger = logging.getLogger(__name__)


# There are some places in the cities500 dataset that shouldn't be
# there, like that one Hardee's in Los Angeles.
__bad_places = [
    "Firing Range, GA",
    "Sugarcreek Police Dept, OH",
    "Washington Street Courthouse Annex, AL",
    "Carls Jr, CA",
]


# This has a lot of arguments, but it hides a fair bit of complexity in exchange
# and that feels worthwhile to me, so I've opted to turn off this rule here.
def __load_from_shapefile(  # noqa: PLR0913
    model,
    url,
    type,
    callback_get_unique,
    callback_get_unique_query,
    callback_create_model,
):
    logger.info(f"loading {type}")

    table = model._meta.db_table
    shapefile = get_shapefile(url)

    # Shapefiles do not support multipolygon features. Instead, a single
    # entity may have multiple features. Our database does support
    # multipolygon types, though, so if we encounter an entity we've seen
    # before, we'll union its existing geometry with this new one rather
    # than create a new entity.
    known = set()

    try:
        for feature in tqdm(iterable=shapefile[0], ncols=50, leave=False):
            # Get a unique identifier for this feature.
            unique = callback_get_unique(feature)

            # If we've seen it before, add this geometry to it rather than create
            # a new one.
            if unique in known:
                where, parameters = callback_get_unique_query(feature)
                geometry = feature.geom.json

                cursor = connection.cursor()

                # There's a SQL injection vector here, but considering we control
                # all of the code associated with it, it seems fine. We are using
                # parameterization on the actual values from the shapefiles which
                # mitigates the risk.
                cursor.execute(
                    f"""UPDATE {table} SET
                        shape=ST_Union(
                            shape,
                            ST_GeomFromGeoJSON(%s))
                        WHERE {where}""",  # noqa: S608
                    [geometry] + parameters,
                )
                cursor.close()
            else:
                callback_create_model(feature)
                known.add(unique)

        # Update the timestamp for this table in the metadata
        WeatherSpatialMetadata.objects.update_or_create(table=table)

    except Exception:
        logger.exception(f"  !! error when loading {model.__name__}")
        model.objects.all().delete()

    logger.info(f"  :: loaded {str(model.objects.count())} entities")


def load_states(force=False):
    """Load state data."""
    if WeatherStates.objects.count() and not force:
        logger.info("States are already loaded. Pass --force to re-create.")
        return

    WeatherStates.objects.all().delete()

    def getid(feature):
        return feature.get("FIPS")

    def getquery(feature):
        return "fips=%s", [getid(feature)]

    def create_model(feature):
        WeatherStates(
            state=feature.get("STATE"),
            name=feature.get("NAME"),
            fips=feature.get("FIPS"),
            shape=GEOSGeometry(feature.geom.json),
        ).save()

    __load_from_shapefile(
        model=WeatherStates,
        url="https://www.weather.gov/source/gis/Shapefiles/County/s_16ap26.zip",
        type="states",
        callback_get_unique=getid,
        callback_get_unique_query=getquery,
        callback_create_model=create_model,
    )


def load_cwas(force=False):
    """Load county warning area data."""
    if WeatherCountyWarningAreas.objects.count() and not force:
        logger.info("CWAs are already loaded. Pass --force to re-create.")
        return

    WeatherCountyWarningAreas.objects.all().delete()

    def getid(feature):
        return feature.get("CWA")

    def getquery(feature):
        return "cwa=%s", [getid(feature)]

    def create_model(feature):
        WeatherCountyWarningAreas(
            wfo=feature.get("WFO"),
            cwa=feature.get("CWA"),
            region=feature.get("REGION"),
            city=feature.get("CITY"),
            shape=GEOSGeometry(feature.geom.json),
        ).save()

    __load_from_shapefile(
        model=WeatherCountyWarningAreas,
        url="https://www.weather.gov/source/gis/Shapefiles/WSOM/w_16ap26.zip",
        type="county warning area",
        callback_get_unique=getid,
        callback_get_unique_query=getquery,
        callback_create_model=create_model,
    )


def __get_countyname(feature):
    countyfips = feature.get("FIPS")
    countyname = feature.get("COUNTYNAME")

    # The county shapefile represents some counties with multiple features
    # because shapefiles can't handle multipolygons. In a small handful of
    # cases, the various features for a single county have different
    # COUNTYNAME properties. We need canonical names, so the following
    # logic handles those exceptional cases.

    # Monroe County, FL, is divided into four features in the shapefile. One
    # is for the mainland part of the county and the other three are for
    # the island portions. The island features have names different from
    # "Monroe," but for our purposes we'll normalize.
    if countyfips == "12087":
        countyname = "Monroe"

    # Hawaii County only has one feature, but its county name property is
    # "Hawaii in Hawaii" which is funny but not what we want. Meanwhile,
    # Honolulu County, also with a single fature, has its name listed as
    # "Oahu in Honolulu." :srhugging-person-made-of-symbols:
    elif countyfips == "15001":
        countyname = "Hawaii"
    elif countyfips == "15003":
        countyname = "Honolulu"

    # Kauaʻi County covers two islands, represented by two features. The
    # features use the island names instead of the county name, so we'll
    # fix that up.
    elif countyfips == "15007":
        countyname = "Kauai"

    # Same story with Maui County with its four islands.
    elif countyfips == "15009":
        countyname = "Maui"

    # There are four islands in the "Northern Islands" county of the
    # Northern Mariana Islands. Fun fact: the population of this county in
    # 2009 was 7.
    elif countyfips == "69085":
        countyname = "Northern Islands"

    # The Federate States of Micronesia are freely associated with the
    # United States, and they don't really have "counties" per se. They have
    # states, as suggested by the name. Anyway, the organization of
    # Micronesian political subunits is not captured well with FIPS.
    # 64001 includes places in three different states, which it should not
    # do. I don't know enough about Micronesia to suss out we ought to
    # address it, so I've opted to stick with the boundaries are set forth
    # in the shapefile on the assumption that the folks at NWS have put in
    # plenty of thought of the best way to represent this for their users.
    # And for our purposes, where we need a canonical name, I picked the
    # state that most of the features are in or associated with.
    elif countyfips == "64001":
        countyname = "Pohnpei"

    return countyname


def load_counties(force=False):
    """Load county data."""
    if WeatherCounties.objects.count() and not force:
        logger.info("Counties are already loaded. Pass --force to re-create.")
        return

    WeatherCounties.objects.all().delete()

    # Counties are uniquely defined by their 3-digit FIPS code PLUS their state.
    # FIPS codes are reused between states.
    def getid(feature):
        return feature.get("STATE") + feature.get("FIPS")

    def getquery(feature):
        return "st=%s AND countyfips=%s", [feature.get("STATE"), feature.get("FIPS")]

    def create_model(feature):
        countyname = __get_countyname(feature)

        timezone = feature.get("TIME_ZONE")
        county = WeatherCounties(
            countyname=countyname,
            countyfips=feature.get("FIPS"),
            st=feature.get("STATE"),
            # The shapefile indicates whether a county observes DST by
            # capitalizing the timezone code.
            dst=timezone == timezone.upper(),
            # The shapefile timezones are 1- or 2-digit codes, but we want
            # the IANA timezones instead, so grab those.
            timezone=SHAPE_TZ_TO_IANA[timezone[:1].upper()],
            shape=GEOSGeometry(feature.geom.json),
        )

        # Counties are linked to states and CWAs, so add those.
        county.state = WeatherStates.objects.get(state=county.st)

        cwastring = feature.get("CWA")
        cwas = [cwastring[y - 3 : y] for y in range(3, len(cwastring) + 3, 3)]

        # If a county is only covered by a single WFO, then it is primary.
        if len(cwas) == 1:
            county.primarywfo = WeatherCountyWarningAreas.objects.get(cwa=cwas[0])
        # Otherwise, we need to look up which one is primary in our mapping.
        elif county.countyfips in COUNTY_FIPS_TO_PRIMARY_WFO_MAP:
            county.primarywfo = WeatherCountyWarningAreas.objects.get(
                wfo=COUNTY_FIPS_TO_PRIMARY_WFO_MAP[county.countyfips],
            )

        # The model must be saved before we can setup many-to-many relationships.
        county.save()

        for cwa in cwas:
            county.cwas.add(WeatherCountyWarningAreas.objects.get(cwa=cwa))

        county.save()

    __load_from_shapefile(
        model=WeatherCounties,
        url="https://www.weather.gov/source/gis/Shapefiles/County/c_16ap26.zip",
        type="counties",
        callback_get_unique=getid,
        callback_get_unique_query=getquery,
        callback_create_model=create_model,
    )


def load_zones(force=False):
    """Load zone data."""
    if WeatherZone.objects.count() and not force:
        logger.info("Zones are already loaded. Pass --force to re-create.")
        return

    WeatherZone.objects.all().delete()

    zonetypes = [
        ["forecast", "https://www.weather.gov/source/gis/Shapefiles/WSOM/z_16ap26.zip"],
        ["fire", "https://www.weather.gov/source/gis/Shapefiles/WSOM/fz16ap26.zip"],
        [
            "marine:coastal",
            "https://www.weather.gov/source/gis/Shapefiles/WSOM/mz16ap26.zip",
        ],
        [
            "marine:offshore",
            "https://www.weather.gov/source/gis/Shapefiles/WSOM/oz16ap26.zip",
        ],
    ]

    for type, url in zonetypes:
        # Use type=type as a default argument to bind the loop variable to the
        # function. Otherwise we get a B023 lint error.
        # https://docs.astral.sh/ruff/rules/function-uses-loop-variable/
        def getid(feature, type=type):
            return (
                # Unlike forecast zones, marine zones have fully-qualified IDs, so
                # we just boop the URL part right on the front. The API uses
                # "forecast" in the path so we do too.
                f"https://api.weather.gov/zones/forecast/{feature.get('ID')}"
                if type.startswith("marine:")
                # For forecast and fire zones, however, the zone ID is only
                # unique within the state and type to which it belongs. So we
                # build up a globally-unique zone ID ourselves. This URI should
                # match the zone IDs returned by the API.
                else (f"https://api.weather.gov/zones/{type}/{feature.get('STATE')}Z{feature.get('ZONE')}")
            )

        def getquery(feature):
            return "id=%s", [getid(feature)]

        def create_model(feature, type=type):
            WeatherZone(
                id=getid(feature),
                # Marine zones don't have states
                state=None if type.startswith("marine:") else feature.get("STATE"),
                type=type,
                shape=GEOSGeometry(feature.geom.json),
            ).save()

        __load_from_shapefile(
            model=WeatherZone,
            url=url,
            type=f"{type} zones",
            callback_get_unique=getid,
            callback_get_unique_query=getquery,
            callback_create_model=create_model,
        )


def __is_invalid_place(place):
    return (
        place["country"] not in US_CODES
        or not place["code"].startswith("PPL")
        or f"{place['name']}, {place['state']}" in __bad_places
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
    wkt = f"POINT({place['lon']} {place['lat']})"
    county = WeatherCounties.objects.filter(shape__contains=wkt).first()
    if county is not None:
        return county.countyfips

    # We ought not reach this point, but just in case we do, flag it bigly.
    logger.error("========= NO COUNTY FOUND =========")
    logger.error(place)
    return None


def load_places(force=False):
    """Load place data."""
    if WeatherPlace.objects.count() and not force:
        logger.info("Places are already loaded. Pass --force to re-create.")
        return

    logger.info("loading places")
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

    try:
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
            place.state = csv_place["state"] if csv_place["country"] == "US" else csv_place["country"]

            # Create a WKT string in order to create the geometry. We may
            # also use this WKT string for a county lookup later on.
            wkt = f"POINT({csv_place['lon']} {csv_place['lat']})"
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
                logger.warning(
                    f"couldn't get county for FIPS {place.countyfips} ({place.state})",
                )

            place.save()

        # Update the timestamp for this table in the metadata
        WeatherSpatialMetadata.objects.update_or_create(table=WeatherPlace._meta.db_table)

    except Exception:
        model = WeatherPlace
        logger.exception(f"  !! error when loading {model.__name__}")
        model.objects.all().delete()

    csvfile.close()
    logger.info(f"loaded {str(WeatherPlace.objects.count())} places")
