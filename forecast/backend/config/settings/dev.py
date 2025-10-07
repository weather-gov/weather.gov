"""
beta.weather.gov development settings.

These settings are intended for use during
local development
"""
from .base import *  # noqa
# spell out explicit variable dependencies
from .base import ALLOWED_HOSTS


SETTINGS_TYPE = "dev"

# Wagtail
WAGTAILADMIN_BASE_URL = "http://localhost:8080"

# allow dev laptop and docker-compose network to connect
ALLOWED_HOSTS += ("localhost", "web", "0.0.0.0") # noqa: S104 (DEBUG is never turned on in prod)
SECURE_SSL_REDIRECT = False
SECURE_HSTS_PRELOAD = False
SECURE_CROSS_ORIGIN_OPENER_POLICY = "localhost"
