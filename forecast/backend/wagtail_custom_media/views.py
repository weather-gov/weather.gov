from collections import defaultdict

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.generic import TemplateView
from wagtail.images import get_image_model
from wagtail.images.views.images import CreateView as WagtailImageCreateView
from wagtail.images.views.multiple import AddView as WagtailImageMultipleAddView
from wagtail.models import Collection
from wagtail.permissions import collection_permission_policy


class ImageCreateRedirectToEditView(WagtailImageCreateView):
    """Give the user the option to go to the edit view (to set a focal point) after upload."""

    def get_success_url(self):
        """Get the URL to redirect to after successfully creating an image."""
        return self.get_edit_url()


class ImageMultipleAddWithFocalPointLinkView(WagtailImageMultipleAddView):
    """Add a per-row "Edit focal point" link, since the multi-upload form excludes those fields."""

    edit_form_template_name = "wagtailimages/multiple/edit_form.html"


Image = get_image_model()


def _annotate_totals(node):
    """Set each node's count to include the images nested beneath it."""
    node["total_images"] = len(node["images"]) + sum(_annotate_totals(child) for child in node["children"])
    return node["total_images"]


class ImageTreeView(TemplateView):
    """Display the image tree view."""

    template_name = "wagtailadmin/image_tree.html"

    def get_context_data(self, **kwargs):
        """Get the context data for the image tree view."""
        context = super().get_context_data(**kwargs)
        user = self.request.user

        images_by_collection = defaultdict(list)
        for image in Image.objects.order_by("title"):
            images_by_collection[image.collection_id].append(image)

        # Ordering by path yields tree order, so a parent is always built before
        # the children that attach to it.
        nodes_by_path = {}
        roots = []
        for collection in Collection.objects.order_by("path"):
            node = {
                "collection": collection,
                "images": images_by_collection.get(collection.id, []),
                "children": [],
                "can_add": collection_permission_policy.user_has_permission_for_instance(user, "add", collection),
            }
            nodes_by_path[collection.path] = node

            parent = nodes_by_path.get(collection.path[: -Collection.steplen])
            if parent:
                parent["children"].append(node)
            else:
                roots.append(node)

        for root in roots:
            _annotate_totals(root)

        context["tree_data"] = roots
        return context


@login_required
@require_POST
def add_collection(request):
    """Create a collection under a given parent, for the quick-add controls in the tree view and upload forms."""
    name = (request.POST.get("name") or "").strip()
    parent_id = request.POST.get("parent_id")

    if not name:
        return JsonResponse({"error": "Please enter a collection name."}, status=400)

    parent = Collection.objects.filter(pk=parent_id).first() if parent_id else Collection.get_first_root_node()
    if parent is None:
        return JsonResponse({"error": "Unknown parent collection."}, status=400)

    if not collection_permission_policy.user_has_permission_for_instance(request.user, "add", parent):
        return JsonResponse({"error": "You don't have permission to add a collection here."}, status=403)

    if parent.get_children().filter(name=name).exists():
        return JsonResponse({"error": "A collection with that name already exists here."}, status=400)

    collection = parent.add_child(instance=Collection(name=name))

    return JsonResponse(
        {
            "id": collection.id,
            "name": collection.name,
            "label": collection.get_indented_name(),
            "parent_id": parent.id,
        }
    )
