"""
beta.weather.gov production settings.

These settings are intended for use within
our cloud-gov production environment(s)
"""
import os
import subprocess

import environs
from cfenv import AppEnv

from noaa_saml.config import get_cloud_gov_settings

from .base import *  # noqa

SETTINGS_TYPE = "production"

# DEBUG is always off in production
DEBUG = False

ALLOWED_HOSTS = [
    "weathergov-test.app.cloud.gov",
    "weathergov-staging.app.cloud.gov",
    "beta.weather.gov",
]

# Helpers
def find_cloudgov_library(name):
    """
    Find the cloud.gov apt installed library.

    In cloud.gov, buildpacks install their dependencies in
    `/home/vcap/deps`; since the apt buildpack is configured to run first, we
    search in `/home/vcap/deps/0/lib` for the libraries we need. (`/1` is
    for the python buildpack, which runs second)
    """
    apt_library_dir = "/home/vcap/deps/0/lib"
    ls_output = subprocess.run(["/bin/ls", "-1", apt_library_dir], check=True, capture_output=True) # noqa: S603 (no untrusted input)
    ls_list = ls_output.stdout.decode("utf8").split("\n")
    lib_entry = [entry for entry in ls_list if entry.strip().startswith(name)]
    if lib_entry:
        return f"{apt_library_dir}/{lib_entry[0].strip()}"
    return None

def find_cloudgov_proj_resources(name):
    """Find the cloud.gov apt installed PROJ resources.

    PROJ bundles preconfigured transformations and default parameters that need
    to be passed in for coordinate reference systems to work.
    """
    apt_library_dir = "/home/vcap/deps/0/"
    find_output = subprocess.run(["/bin/find", apt_library_dir], check=True, capture_output=True) # noqa: S603 (no untrusted input)
    find_list = find_output.stdout.decode("utf8").split("\n")
    resource_entry = [entry for entry in find_list if entry.strip().endswith(name)]
    if resource_entry:
        return os.path.dirname(resource_entry[0])
    return None



env = environs.Env()
cloudgov_space = env("CLOUDGOV_SPACE", "test")

# Get secrets from Cloud.gov user provided service, if exists
# If not, get secrets from environment variables
key_service = AppEnv().get_service(name=f"{cloudgov_space}-credentials")
rds_service = AppEnv().get_service(name=f"weathergov-rds-{cloudgov_space}")

if key_service and key_service.credentials:
    secret = key_service.credentials.get
else:
    secret = env

# Set the secret key based on the function,
# which will either be the getter for a secret
# value in VCAP or just the environment itself
secret_key = secret("django_secret_key")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = secret_key

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases
db_credentials = rds_service.credentials
# NB: Jammy (Ubuntu LTS) has slightly older versions than in our images.
# GEOS_LIBRARY_PATH = "/home/vcap/deps/0/lib/libgeos_c.so.1"
# GDAL_LIBRARY_PATH = "/home/vcap/deps/0/lib/libgdal.so.30"
GEOS_LIBRARY_PATH = find_cloudgov_library("libgeos")
GDAL_LIBRARY_PATH = find_cloudgov_library("libgdal")
# we need to tell PROJ where its resources can be found. so let's look for
# the projection database and return the basedir. typically this is at
# /home/vcap/deps/0/apt/usr/share/proj/
os.environ["PROJ_LIB"] = find_cloudgov_proj_resources("proj.db")

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": db_credentials["name"],
        "USER": db_credentials["username"],
        "PASSWORD": db_credentials["password"],
        "HOST": db_credentials["host"],
        "PORT": db_credentials["port"],
    },
}

# Wagtail
# Note: might need to join `cms/` to the uri
# to get the correct admin base url
WAGTAILADMIN_BASE_URL = AppEnv().uris[0]


# SAML Settings
# See noaa_saml/config.py for details
SAML_SETTINGS = get_cloud_gov_settings()
