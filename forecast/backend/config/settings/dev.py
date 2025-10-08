"""
beta.weather.gov development settings.

These settings are intended for use during
local development
"""
import environs

from noaa_saml import config as saml_config

from .base import *  # noqa

# spell out explicit variable dependencies
from .base import ALLOWED_HOSTS

SETTINGS_TYPE = "dev"

env = environs.Env()

SECRET_KEY = env("django_secret_key")

# Wagtail
WAGTAILADMIN_BASE_URL = "http://localhost:8080"

# allow dev laptop and docker-compose network to connect
ALLOWED_HOSTS += ("localhost", "web", "0.0.0.0") # noqa: S104 (DEBUG is never turned on in prod)
SECURE_SSL_REDIRECT = False
SECURE_HSTS_PRELOAD = False
SECURE_CROSS_ORIGIN_OPENER_POLICY = "localhost"

# SAML Settings
# See noaa_saml/config.py for details
SAML_SETTINGS = saml_config.DEV
SAML_LOCAL_DEV = True
