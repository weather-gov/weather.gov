import os
import re
from urllib.parse import urlparse
from zipfile import ZipFile

import requests
from django.contrib.gis.gdal import DataSource
from django.contrib.gis.utils import LayerMapping

cache_path = os.path.dirname(os.path.realpath(__file__)) + "/__cache/"

# A list of files added to the cache.
__cached_files = []

# The following is a list of the two-letter (ISO-3166-alpha2) country
# codes for the USA and its overseas territories. Note that the
# territories have their own codes
US_CODES = [
    "US",
    "GU",  # Guam
    "PR",  # Puerto Rico
    "AS",  # American Samoa
    "MP",  # Northern Mariana Islands
    "VI",  # US Virgin Islands
    "UM",  # US Minor Outlying Islands
]

SHAPE_TZ_TO_IANA = {
    "V": "America/Puerto_Rico",
    "E": "America/New_York",
    "C": "America/Chicago",
    "M": "America/Denver",
    "P": "America/Los_Angeles",
    "A": "America/Anchorage",
    "H": "Pacific/Honolulu",
    "G": "Pacific/Guam",
    "J": "Asia/Tokyo",
    "S": "Pacific/Pago_Pago",
    "K": "Pacific/Kwajalein",
    "F": "Pacific/Kosrae",
}

COUNTY_FIPS_TO_PRIMARY_WFO_MAP = {
    "23025": "GYX",
    "36011": "BUF",
    "06071": "VEF",
    "04007": "PSR",
    "04021": "PSR",
    "06091": "STO",
    "06065": "SGX",
    "06109": "HNX",
    "06057": "STO",
    "06003": "STO",
    "06063": "STO",
    "06035": "REV",
    "06049": "MFR",
    "06017": "STO",
    "06061": "STO",
    "32023": "VEF",
    "49037": "GJT",
}


class CustomLayerMapping(LayerMapping):
    """Custom class to support adding static data to spatial layers."""

    def __init__(self, *args, **kwargs):
        self.custom = kwargs.pop("custom", {})
        super(CustomLayerMapping, self).__init__(*args, **kwargs)

    def feature_kwargs(self, feature):
        """Add custom fields."""
        kwargs = super(CustomLayerMapping, self).feature_kwargs(feature)
        kwargs.update(self.custom)
        return kwargs


def clean_cache():
    """Delete any files added to the cache."""
    [os.remove(cache_path + file) for file in __cached_files]


def unzip_cache(filename):
    """Unzip a file stored in the cache directory."""
    with ZipFile(cache_path + filename, "r") as zip:
        zip.extractall(cache_path)
        # Keep track of the files that we unzipped, for cleanup purposes
        [__cached_files.append(file) for file in zip.namelist()]


def get_shapefile(url):
    """Download a shapefile from a URL, if necessary, unzip it, and load it into a reader."""
    filename = os.path.basename(urlparse(url).path)
    fullpath = cache_path + filename

    if not os.path.isfile(fullpath):
        with requests.get(url, stream=True, timeout=10) as r:
            r.raise_for_status()
            with open(fullpath, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            # Keep track of any files we download, for cleanup purposes
            __cached_files.append(filename)

    unzip_cache(os.path.basename(fullpath))
    return DataSource(re.sub(r"\.zip$", ".shp", fullpath))
