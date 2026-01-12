from django.http import Http404
from django.urls import NoReverseMatch, reverse


def get_redirect_for_afd_queries(request):
    """
    Pull out querystring values from a request to /afd.

    Given a request to the index /afd endpoint,
    attempt to pull out any querystring values.
    If they are present, this means the update form
    was submitted, and we should process a redirect.
    Return the redirect url string.
    Otherwise, return None.

    Raises Http404 for invalid values.
    """
    # These two are passed from select/combobox
    # input values on an AFD page
    wfo = request.GET.get("wfo", "")
    afd_id = request.GET.get("id", "")

    # These two are always present on the full AFD page
    # as hidden inputs. When the page is rendered, they
    # hold what the page's initial WFO and AFD id values
    # were before any select/combobox selections.
    current_wfo = request.GET.get("current-wfo", "")
    current_afd_id = request.GET.get("current-id", "")

    wfo_was_updated = wfo != current_wfo
    id_was_updated = afd_id != current_afd_id
    try:
        if wfo_was_updated and id_was_updated:
            return reverse("afd_by_office_and_id", kwargs={"wfo": wfo.lower(), "afd_id": afd_id})
        if wfo_was_updated:
            return reverse("afd_by_office", kwargs={"wfo": wfo.lower()})
        if id_was_updated:
            return reverse("afd_by_office_and_id", kwargs={"wfo": wfo.lower(), "afd_id": afd_id})
    except NoReverseMatch as e:
        raise Http404() from e
    return None
