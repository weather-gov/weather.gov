from django.templatetags.static import static
from django.urls import path
from django.utils.html import format_html
from wagtail import hooks
from wagtail.admin.menu import MenuItem
from wagtail.admin.panels import FieldPanel
from wagtail.admin.viewsets.base import ViewSet
from wagtail.snippets.models import register_snippet
from wagtail.snippets.views.snippets import SnippetViewSet

from .models import (
    WFO,
    DynamicSafetyInformation,
    HazardousWeatherOutlookLevels,
    HazardousWeatherOutlookMetadata,
    Region,
)
from .wagtail_custom_media.views import (
    ImageCreateRedirectToEditView,
    ImageMultipleAddWithFocalPointLinkView,
    ImageTreeView,
    add_collection,
)


@hooks.register("register_admin_viewset")
def register_image_tree_viewset():
    """Register the viewset."""
    return ImageTreeViewSet()


# The Images default menu item order is 300
@hooks.register("register_admin_menu_item")
def register_image_tree_menu_item():
    """Register the image tree menu item."""
    return MenuItem(
        "Image Tree",
        "/cms/image-tree/",  # Point directly to your custom viewset URL route
        icon_name="folder-open-inverse",
        order=301,  # Places it right underneath the native "Images" sidebar item
    )


# Wagtail's image CreateView fires no post-create hook, so override its URL directly.
# A negative order sorts this before wagtail.images' own registration, so ours matches first.
@hooks.register("register_admin_urls", order=-1)
def register_image_add_redirect():
    """Override the default image add views to include a link to the edit view."""
    return [
        path("images/add/", ImageCreateRedirectToEditView.as_view()),
        path("images/multiple/add/", ImageMultipleAddWithFocalPointLinkView.as_view()),
    ]


# For editor views, add our custom editor javascript.
@hooks.register("insert_editor_js")
def editor_js():
    """Inject our Javascript for the CMS into every editor page."""
    return format_html('<script type="module" src="{}"></script>', static("js/cms/editor.html.js"))


# insert_editor_js only fires on the page editor, so use insert_global_admin_js to also
# reach the image upload/edit views where the collection quick-add control is needed.
@hooks.register("insert_global_admin_js")
def collection_quick_add_js():
    """Add a "+ New collection" control next to any collection dropdown in the admin."""
    return format_html(
        '<script type="module" src="{}"></script>',
        static("js/cms/collection-quick-add.js"),
    )


@hooks.register("insert_global_admin_css")
def custom_admin_css():
    """Load styles for our custom admin views (compiled from frontend/assets/sass/wagtail-admin.scss)."""
    return format_html('<link rel="stylesheet" href="{}">', static("css/wagtail-admin.css"))


class ImageTreeViewSet(ViewSet):
    """ViewSet for the image tree view in the Wagtail admin."""

    # This matches naming protocols found inside Wagtail Documentation
    name = "image_tree"
    url_prefix = "image-tree"

    def get_urlpatterns(self):
        """Get the URL patterns for the image tree view and add_collection buttons."""
        return [
            path("", ImageTreeView.as_view(), name="index"),
            path("add-collection/", add_collection, name="add_collection"),
        ]


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
