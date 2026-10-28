"""
beta.weather.gov production settings.

These settings are intended for use within NEC.
"""

import os
from urllib.parse import urlparse

import environs
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

env = environs.Env()

SETTINGS_TYPE = "production"

# DEBUG is always off in production
DEBUG = False
TESTING = False


def ensure_environment_variables_are_present(envvars):
    """Check for required environment variables."""
    for envvar in envvars:
        if not env.str(envvar, ""):
            message = f"Required environment variable {envvar} is not set"
            raise ImproperlyConfigured(message)


# we want to bail out if any of these are not set.
ensure_environment_variables_are_present(
    [
        "NEC_ADDRESS",
        "DJANGO_SECRET_KEY",
        # not supported on NEC.
        # "SP_PUBLIC_KEY",
        # "SP_PRIVATE_KEY",
    ],
)

nec_address = env.str("NEC_ADDRESS", validate=environs.validate.URL())
ALLOWED_HOSTS = [
    urlparse(nec_address).hostname,
]

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env.str("DJANGO_SECRET_KEY")

GEOS_LIBRARY_PATH = "/usr/lib/x86_64-linux-gnu/libgeos_c.so.1"
GDAL_LIBRARY_PATH = "/usr/lib/x86_64-linux-gnu/libgdal.so.34"

# must be exported as an env var
os.environ["PROJ_LIB"] = "/usr/share/proj/"


def get_production_pool_limits():
    """
    Get production pool limits.

    Ensure the database pool allocation is spread evenly across all web
    instances, taking in account gevent workers.
    """
    max_connections = env.int("WEB_DB_MAX_CONNECTIONS", 195)
    instances = env.int("WEB_INSTANCES", 1) * env.int("WEB_GEVENT_WORKERS", 1)
    max_size = max(max_connections // instances, 5)
    min_size = max(max_size // 2, 2)
    return {
        "min_size": min_size,
        "max_size": max_size,
    }


DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": env.str("DB_NAME"),
        "USER": env.str("DB_USERNAME"),
        "PASSWORD": env.str("DB_PASSWORD"),
        "HOST": env.str("DB_HOST"),
        "PORT": env.str("DB_PORT"),
        "OPTIONS": {"pool": get_production_pool_limits()},
    },
}

# add this NEC app and s3 bucket to content security policy configuration
CONTENT_SECURITY_POLICY["DIRECTIVES"][  # noqa: F405 (imported from base.py)
    "default-src"
] += ALLOWED_HOSTS
CONTENT_SECURITY_POLICY["DIRECTIVES"][  # noqa: F405 (imported from base.py)
    "form-action"
] += [
    "https://sso.noaa.gov",
]

# SAML Settings
# See noaa_saml/config.py for details
# Not supported on NEC.
SAML_SETTINGS = {}
LOGIN_URL = "/saml/login"

# Wagtail
WAGTAIL_FRONTEND_LOGIN_URL = LOGIN_URL
WAGTAILADMIN_LOGIN_URL = LOGIN_URL
WAGTAILADMIN_BASE_URL = nec_address

# in production, we want to output JSON to the console instead. to do this, we
# configure a JSON formatter and set all handlers to use this JSON formatter.

LOGGING["formatters"] = {  # noqa: F405 (imported from base.py)
    "json": {
        "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
        "format": "%(asctime)s %(levelname)s %(name)s %(lineno)s %(message)s",
        "datefmt": "%d/%b/%Y %H:%M:%S",
    },
}
LOGGING["handlers"]["console"][  # noqa: F405 (imported from base.py)
    "formatter"
] = "json"
LOGGING["handlers"]["django.server"][  # noqa: F405 (imported from base.py)
    "formatter"
] = "json"
