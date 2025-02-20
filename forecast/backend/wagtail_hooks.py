from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet
from .models import Region, WFO

class WFOAdminSnippet(SnippetViewSet):
    model = WFO
    menu_label = "WFOs"
    menu_name = "wfos"
    icon = "globe"
    add_to_settings_menu = False
    add_to_admin_menu = True
    exclude_from_explorer = False
    list_display = ("code", "name")
    list_filter = ("code", )
    search_fields = ("code", "name")

class RegionAdminSnippet(SnippetViewSet):
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

register_snippet(WFOAdminSnippet)
register_snippet(RegionAdminSnippet)
