"""
beta.weather.gov CI settings.

These settings are intended for use during
CI tests and builds
"""
import environs

from .base import *  # noqa

# For now, we keep CI identical to production.
# In subsequent work -- SAML, for example -- we
# will need to add separate and specific values
# for CI

SETTINGS_TYPE = "ci"

DEBUG = False

ALLOWED_HOSTS = [
    "weathergov-test.app.cloud.gov",
    "weathergov-staging.app.cloud.gov",
    "beta.weather.gov",
]

# Use development secret key
env = environs.Env()
SECRET_KEY = env("django_secret_key")
