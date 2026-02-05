from django.templatetags.static import static
from django.utils.html import format_html
from wagtail import hooks
from wagtail.admin.panels import FieldPanel
from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet

from .models import (
    WFO,
    DynamicSafetyInformation,
    HazardousWeatherOutlookLevels,
    HazardousWeatherOutlookMetadata,
    Region,
)


# For editor views, add our custom editor javascript.
@hooks.register("insert_editor_js")
def editor_js():
    """Inject our Javascript for the CMS into every editor page."""
    return format_html('<script type="module" src="{}"></script>', static("js/cms/editor.html.js"))


class WFOAdminSnippet(SnippetViewSet):
    """Bind the Weather Forecast Office model's data to snippets that can be edited and displayed in the CMS."""

    model = WFO
    menu_label = "WFOs"
    menu_name = "wfos"
    icon = "globe"
    add_to_settings_menu = False
    add_to_admin_menu = True
    exclude_from_explorer = False
    list_display = ("code", "name")
    list_filter = ("code",)
    search_fields = ("code", "name")


class RegionAdminSnippet(SnippetViewSet):
    """Bind the Region model's data to snippets that can be edited and displayed in the CMS."""

    model = Region
    menu_label = "Regions"
    menu_name = "regions"
    icon = "globe"
    add_to_settings_menu = False
    add_to_admin_menu = True
    exclude_from_explorer = False
    list_display = ("name",)
    list_filter = ("name",)
    search_fields = ("name",)


class DynamicSafetyInformationAdminSnippet(SnippetViewSet):
    """Bind the Safety Information model's data to snippets that can be edited and displayed in the CMS."""

    model = DynamicSafetyInformation
    menu_label = "Safety Information"
    menu_name = "safety-information"
    icon = "warning"
    add_to_settings_menu = False
    add_to_admin_menu = True
    exclude_from_explorer = False
    list_display = ("type",)
    list_filter = ("type",)
    search_fields = ("type",)


class HazardousWeatherOutlookMetadataSnippet(SnippetViewSet):
    """Binds the hazardous weather outlook defaults to the admin view in the CMS."""

    model = HazardousWeatherOutlookMetadata
    menu_label = "Hazardous Weather Outlook"
    menu_name = "hazardous-weather-outlook"
    icon = "warning"
    add_to_admin_menu = True
    search_fields = ("type",)

    def get_queryset(self, _request):
        """Get the default metadata."""
        return HazardousWeatherOutlookMetadata.objects.filter(wfo=None)

    panels = [FieldPanel("basis")]


class HazardousWeatherOutlookMetadataLevelsSnippet(SnippetViewSet):
    """Binds the hazardous weather outlook level defaults to the admin view in the CMS."""

    model = HazardousWeatherOutlookLevels
    menu_label = "Hazardous Weather Levels"
    menu_name = "hazardous-weather-levels"
    icon = "warning"
    add_to_admin_menu = True
    search_fields = ("type",)

    def get_queryset(self, _request):
        """Get the default metadata levels."""
        return HazardousWeatherOutlookLevels.objects.filter(wfo=None).order_by("type", "number")

    panels = [FieldPanel("label"), FieldPanel("description")]


register_snippet(WFOAdminSnippet)
register_snippet(RegionAdminSnippet)
register_snippet(DynamicSafetyInformationAdminSnippet)
register_snippet(HazardousWeatherOutlookMetadataSnippet)
register_snippet(HazardousWeatherOutlookMetadataLevelsSnippet)
