from backend import interop
from backend.util import get_wfo_from_afd
from backend.models import WFO, Region
from django.http import HttpResponse, Http404
from django.shortcuts import render, redirect
from django.template.loader import render_to_string


# Helpers
def _get_redirect_for_afd_queries(request):
    """
    Given a request to the index /afd endpoint,
    attempt to pull out any querystring values.
    If they are present, this means the update form
    was submitted, and we should process a redirect.
    Return the redirect url string.
    Otherwise, return None.
    """
    # These two are passed from select/combobox
    # input values on an AFD page
    wfo = request.GET.get("wfo", None)
    afd_id = request.GET.get("id", None)

    # These two are always present on the full AFD page
    # as hidden inputs. When the page is rendered, they
    # hold what the page's initial WFO and AFD id values
    # were before any select/combobox selections.
    current_wfo = request.GET.get("current-wfo", None)
    current_afd_id = request.GET.get("current-id", None)

    wfo_was_updated = wfo != current_wfo
    id_was_updated = afd_id != current_afd_id
    if wfo_was_updated and id_was_updated:
        return f"/afd/{wfo.lower()}/{afd_id}"
    elif wfo_was_updated:
        return f"/afd/{wfo.lower()}"
    elif id_was_updated:
        return f"/afd/{wfo.lower()}/{afd_id}"
    return None


def index(request):
    return render(request, "weather/index.html", locals())


def point_location(request, lat, lon):
    point = interop.get_point_forecast(lat, lon)
    # TODO: Add some error checking here
    wfo = WFO.objects.get(code=point["grid"]["wfo"])
    point["wfo"] = wfo
    return render(request, "weather/point.html", {"point": point})


def offices(request):
    regions = []
    for region in Region.objects.all():
        entry = {"id": region.id, "name": region.name, "weight": region.weight, "wfos": []}
        wfos = region.wfos.all()
        for wfo in wfos:
            wfo_entry = {"id": wfo.code.upper(), "name": wfo.name, "weight": wfo.weight}
            entry["wfos"].append(wfo_entry)
        regions.append(entry)

    return render(request, "weather/offices.html", locals())

def offices_specific(request, wfo):
    office = WFO.objects.get(code=wfo.upper())
    return render(request, "weather/office.html", {'office': office.__dict__})

def afd_index(request):
    """
    Will determine the most recent AFD at _any_ WFO
    and reroute the user to the correct url for that
    product.
    If there are querystring values for the wfo and
    a given afd_id, then we redirect to the correct
    url for that page
    """
    # First, we see if there are querystring values for
    # the WFO and the current/requested AFD id.
    # If the current id (what was being viewed) and
    # the selected id are different, that means we are
    # requesting a new AFD id.
    # Otherwise, if there is a WFO present, we
    # will redirect to the route for the most recent
    # AFD at that location.
    redirect_url = _get_redirect_for_afd_queries(request)
    if redirect_url:
        return redirect(redirect_url)

    # Otherwise, we get the most recent AFD from anywhere
    # in the country, determine the WFO to which it applies,
    # and we redirect to the full url for that resource
    afd_references = interop.get_wx_afd_versions()["@graph"]
    afd_id = afd_references[0]["id"]
    afd_data = interop.get_wx_afd_by_id(afd_id)
    wfo = get_wfo_from_afd(afd_data)
    url = f"/afd/{wfo.lower()}/{afd_id}"
    return redirect(url)


def afd_by_office(request, wfo):
    """
    Will determine the most recent AFD for the given
    WFO office and redirect the user to the correct
    url for that product
    """
    try:
        afd_references = interop.get_wx_afd_versions_by_wfo(wfo.upper())["@graph"]
        afd_id = afd_references[0]["id"]
        url = f"/afd/{wfo.lower()}/{afd_id}"
        return redirect(url)
    except Exception:
        raise Http404()


def afd_by_office_and_id(request, wfo, afd_id):
    """
    Will display the given AFD product by id
    and populate the list of available AFDs for
    the provided WFO
    """
    try:
        # Grab the AFD data from the API and determine which
        # WFO it applies to. There might be cases where the user
        # has input an id and wfo into the url, but they do not correspond.
        # We will redirect in cases where this happens.
        afd_data = interop.get_wx_afd_by_id(afd_id)
        afd_wfo = get_wfo_from_afd(afd_data)
        if not afd_wfo or afd_wfo.lower() != wfo.lower():
            return redirect(f"/afd/{wfo.lower()}/")

        # Otherwise, let's grab all the references for the WFO
        # so we can use them in the select dropdown
        afd_references = interop.get_wx_afd_versions_by_wfo(wfo.upper())["@graph"]
        all_wfos = WFO.objects.values("code", "name")
        wfo_combo_box_data = [{"value": wfo["code"], "text": f"{wfo['name']} ({wfo['code']})"} for wfo in all_wfos]

        # Compose a dictionary in the format that the templates expect
        to_render = {
            "wfo": wfo.upper(),
            "afd": afd_data,
            "wfo_list": wfo_combo_box_data,
            "version_list": afd_references,
        }
    except Exception as e:
        print(e.response.status_code)
        raise Http404
    return render(request, "weather/afd-page.html", to_render)


def wx_afd_id(request, afd_id):
    """
    Will return _markup only_ for a single parsed
    AFD product by id
    """
    data = interop.get_wx_afd_by_id(afd_id)
    markup = render_to_string("weather/wx/afd.html", {"afd": data})
    return HttpResponse(markup, content_type="text/html")


def wx_afd_versions(request, wfo):
    """
    Will return _markup only_ for the versions
    of AFDs for the given forecast office
    """
    data = interop.get_wx_afd_versions_by_wfo(wfo)
    markup = render_to_string("weather/wx/afd-versions-select.html", {"version_list": data["@graph"]})
    return HttpResponse(markup, content_type="text/html")
