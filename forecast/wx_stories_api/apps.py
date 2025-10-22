from django.apps import AppConfig


class WxStoriesAPIConfig(AppConfig):
    """weather.gov wx stories api sub-app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "wx_stories_api"
