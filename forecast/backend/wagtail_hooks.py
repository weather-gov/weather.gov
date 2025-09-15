from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet

from .models import WFO, DynamicSafetyInformation, Region


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


register_snippet(WFOAdminSnippet)
register_snippet(RegionAdminSnippet)
register_snippet(DynamicSafetyInformationAdminSnippet)
