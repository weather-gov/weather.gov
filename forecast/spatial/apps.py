from django.apps import AppConfig


class SpatialConfig(AppConfig):
    """weather.gov spatial sub-app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "spatial"
