"""
beta.weather.gov production settings.

These settings are intended for use within
our cloud-gov production environment(s)
"""

import os
import subprocess

import boto3
import environs
from cfenv import AppEnv
from django.core.exceptions import ImproperlyConfigured

from noaa_saml.config import get_cloud_gov_settings

from .base import *  # noqa: F403

env = environs.Env()
cloudgov_space = env("CLOUDGOV_SPACE", "test")

SETTINGS_TYPE = "production"

# DEBUG is always off in production
DEBUG = False
TESTING = False

ALLOWED_HOSTS = [
    "beta.weather.gov" if cloudgov_space == "prod" else f"weathergov-{cloudgov_space}.app.cloud.gov",
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
    ls_output = subprocess.run(["/bin/ls", "-1", apt_library_dir], check=True, capture_output=True)  # noqa: S603 (no untrusted input)
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
    find_output = subprocess.run(["/bin/find", apt_library_dir], check=True, capture_output=True)  # noqa: S603 (no untrusted input)
    find_list = find_output.stdout.decode("utf8").split("\n")
    resource_entry = [entry for entry in find_list if entry.strip().endswith(name)]
    if resource_entry:
        return os.path.dirname(resource_entry[0])
    return None


def set_cors_on_s3_bucket(bucket_name=None, region_name=None, access_key=None, secret_key=None, **kwargs):
    """Set CORS setting on the given S3 bucket."""
    s3 = boto3.client("s3", region_name=region_name, aws_access_key_id=access_key, aws_secret_access_key=secret_key)
    cors_configuration = {
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET"],
                "AllowedOrigins": ALLOWED_HOSTS,
                "ExposeHeaders": [],
                "MaxAgeSeconds": 3000,
            },
        ],
    }
    # this operation will raise a `botocore.exceptions.ClientError` if not successful
    s3.put_bucket_cors(Bucket=bucket_name, CORSConfiguration=cors_configuration)


# get secrets from Cloud.gov user provided services
key_service = AppEnv().get_service(name=f"{cloudgov_space}-credentials")
rds_service = AppEnv().get_service(name=f"weathergov-rds-{cloudgov_space}")
s3_service = AppEnv().get_service(name=f"weathergov-s3-{cloudgov_space}")


def ensure_environment_variables_are_present(envvars):
    """Check for required environment variables."""
    for env in envvars:
        if not key_service.credentials.get(env):
            raise ImproperlyConfigured


# we want to bail out if any of these are not set.
ensure_environment_variables_are_present(
    [
        "django_secret_key",
        "sp_public_key",
        "sp_private_key",
    ],
)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = key_service.credentials.get("django_secret_key")

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
proj_resource_location = find_cloudgov_proj_resources("proj.db")
if proj_resource_location:
    os.environ["PROJ_LIB"] = proj_resource_location


def get_production_pool_limits():
    """
    Get production pool limits.

    Ensure the database pool allocation is spread evenly across all web
    instances, taking in account gevent workers.
    """
    max_connections = int(os.environ.get("WEB_DB_MAX_CONNECTIONS", "195"))
    instances = int(os.environ.get("WEB_INSTANCES", "1")) * int(os.environ.get("WEB_GEVENT_WORKERS", "1"))
    max_size = max(max_connections // instances, 5)
    min_size = max(max_size // 2, 2)
    return {
        "min_size": min_size,
        "max_size": max_size,
    }


DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": db_credentials["name"],
        "USER": db_credentials["username"],
        "PASSWORD": db_credentials["password"],
        "HOST": db_credentials["host"],
        "PORT": db_credentials["port"],
        "OPTIONS": {"pool": get_production_pool_limits()},
    },
}

# S3 for storing media uploads, such as weather stories and situation reports
s3_credentials = s3_service.credentials
s3_options = {
    "bucket_name": s3_credentials["bucket"],
    "region_name": s3_credentials["region"],
    "access_key": s3_credentials["access_key_id"],
    "secret_key": s3_credentials["secret_access_key"],
    "querystring_auth": False,  # do not send AWSAccessKeyId query params since buckets are public
}

STORAGES["default"] = {  # noqa: F405 (imported from base.py)
    "BACKEND": "storages.backends.s3.S3Storage",
    "OPTIONS": s3_options,
}
set_cors_on_s3_bucket(**s3_options)

s3_image_src = f"https://{s3_credentials['bucket']}.s3.{s3_credentials['region']}.amazonaws.com"

# add this cloud.gov app and s3 bucket to content security policy configuration
CONTENT_SECURITY_POLICY["DIRECTIVES"]["default-src"] += ALLOWED_HOSTS  # noqa: F405 (imported from base.py)
CONTENT_SECURITY_POLICY["DIRECTIVES"]["img-src"] += [s3_image_src]  # noqa: F405 (imported from base.py)
CONTENT_SECURITY_POLICY["DIRECTIVES"]["form-action"] += [  # noqa: F405 (imported from base.py)
    f"https://{ALLOWED_HOSTS[0]}/cms/logout/",
    f"https://{ALLOWED_HOSTS[0]}/saml/logout/",
]

# SAML Settings
# See noaa_saml/config.py for details
SAML_SETTINGS = get_cloud_gov_settings()
LOGIN_URL = "/saml/login"

# Wagtail
WAGTAIL_FRONTEND_LOGIN_URL = LOGIN_URL
WAGTAILADMIN_LOGIN_URL = LOGIN_URL
WAGTAILADMIN_BASE_URL = AppEnv().uris[0]

# in production, we want to output JSON to the console instead. to do this, we
# configure a JSON formatter and set all handlers to use this JSON formatter.

LOGGING["formatters"] = {  # noqa: F405 (imported from base.py)
    "json": {
        "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
        "format": "%(asctime)s %(levelname)s %(name)s %(lineno)s %(message)s",
        "datefmt": "%d/%b/%Y %H:%M:%S",
    },
}
LOGGING["handlers"]["console"]["formatter"] = "json"  # noqa: F405 (imported from base.py)
LOGGING["handlers"]["django.server"]["formatter"] = "json"  # noqa: F405 (imported from base.py)
