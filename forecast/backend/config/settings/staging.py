"""
cloud.gov build settings.

These settings are useful only at cloud.gov build time (see: post_compile)
"""

import os

from .base import *  # noqa: F403

# GDAL/GEOS library paths (set via environment for staging)
GDAL_LIBRARY_PATH = os.environ.get("GDAL_LIBRARY_PATH")
GEOS_LIBRARY_PATH = os.environ.get("GEOS_LIBRARY_PATH")
