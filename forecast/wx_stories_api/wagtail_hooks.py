from wagtail.admin.panels import FieldPanel
from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet

from .models import SituationReport, WeatherStory


class SituationReportAdminSnippet(SnippetViewSet):
    """Bind the Situation Report model's data to snippets that can be edited and displayed in the CMS."""

    model = SituationReport
    menu_label = "Situation reports"
    menu_name = "sitreps"
    icon = "globe"
    add_to_settings_menu = False
    add_to_admin_menu = True
    exclude_from_explorer = False

    # Panels for Wagtail admin
    panels = [
        FieldPanel("title"),
        FieldPanel("wfo"),
    ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class WeatherStoryAdminSnippet(SnippetViewSet):
    """Bind the WeatherStory model's data to snippets that can be edited and displayed in the CMS."""

    model = WeatherStory
    menu_label = "Weather stories"
    menu_name = "wxstories"
    icon = "globe"
    add_to_settings_menu = False
    add_to_admin_menu = True
    exclude_from_explorer = False

    # Panels for Wagtail admin
    panels = [
        FieldPanel("title"),
        FieldPanel("description"),
        FieldPanel("wfo"),
        FieldPanel("image"),
    ]

    def __str__(self):
        return self.name


register_snippet(SituationReportAdminSnippet)
register_snippet(WeatherStoryAdminSnippet)
