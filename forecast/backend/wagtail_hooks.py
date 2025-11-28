from django.templatetags.static import static
from django.utils.safestring import mark_safe
from wagtail import hooks
from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet

from .models import WFO, DynamicSafetyInformation, Region


# For editor views, add our custom editor javascript.
@hooks.register("insert_editor_js")
def editor_js():
    """Inject our Javascript for the CMS into every editor page."""
    return mark_safe(f"""
        <script type="module" src="{static("js/cms/editor.html.js")}"></script>
    """)  # noqa: S308
    # This is safe. Good flag, but yeah, it's safe in this context.


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
