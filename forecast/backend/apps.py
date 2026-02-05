"""
Each Django site can contain multiple independent apps.

These are configured here and installed via settings.py:INSTALLED_APPS.
"""

from django.apps import AppConfig


class BackendConfig(AppConfig):
    """Name and configure the forecast/CMS app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "backend"
