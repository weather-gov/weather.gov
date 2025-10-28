"""
beta.weather.gov CI settings.

These settings are intended for use during
CI tests and builds
"""

import environs

from noaa_saml import config as saml_config

from .base import *  # noqa: F403

# For now, we keep CI identical to production.
# In subsequent work -- SAML, for example -- we
# will need to add separate and specific values
# for CI

SETTINGS_TYPE = "ci"

DEBUG = False
TESTING = True

ALLOWED_HOSTS = [
    "weathergov-test.app.cloud.gov",
    "weathergov-staging.app.cloud.gov",
    "beta.weather.gov",
]

# Use development secret key
env = environs.Env()
SECRET_KEY = env("django_secret_key")

# SAML Settings
# See noaa_saml/config.py for details
# For CI, we need to use the development SAML
# settings, since prod settings check for VCAP
SAML_SETTINGS = saml_config.DEV
