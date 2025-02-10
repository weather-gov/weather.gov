from os import getenv
import requests
from weather import interop
from weather.util import get_wfo_from_afd
from weather.models import WFO
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.template.loader import render_to_string

# Create your views here.
def index(request):
    return render(request, "weather/index.html", locals())


def point_location(request, lat, lon):
    base_url = getenv("INTEROP_URL")
    url = f"{base_url}/point/{lat}/{lon}"
    r = requests.get(url)
    # TODO: Put some error handling here
    point = r.json()

    return render(request, "weather/point.html", locals())

def offices(request):
    regions = []
    for region in Region.objects.all():
        entry = {
            "id": region.id,
            "name": region.name,
            "weight": region.weight,
            "wfos": []
        }
        wfos = region.wfo_set.all()
        for wfo in wfos:
            wfo_entry = {
                "id": wfo.code.upper(),
                "name": wfo.name,
                "weight": wfo.weight
            }
            entry["wfos"].append(wfo_entry)
        regions.append(entry)

    return render(request, "weather/offices.html", locals())
    
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
    # the WFO and/or a specific AFD id
    existing_wfo = request.GET.get("wfo", None)
    existing_afd_id = request.GET.get("id", None)
    if existing_wfo and existing_afd_id:
        return redirect(f"/afd/{existing_wfo.lower()}/{existing_afd_id}")
    elif existing_wfo:
        return redirect(f"/afd/{existing_wfo.lower()}")

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
    afd_references = interop.get_afd_versions_by_office(wfo.upper())["@graph"]
    afd_id = afd_references[0]["id"]
    url = f"/afd/{wfo.lower()}/{afd_id}"
    return redirect(url)

def afd_by_office_and_id(request, wfo, afd_id):
    """
    Will display the given AFD product by id
    and populate the list of available AFDs for
    the provided WFO
    """
    afd_references = interop.get_wx_afd_versions_by_wfo(wfo.upper())["@graph"]
    afd_data = interop.get_wx_afd_by_id(afd_id)
    all_wfos = WFO.objects.values("code", "name")
    wfo_combo_box_data = [{"value": wfo["code"], "text": f"{wfo['name']} ({wfo['code']})"} for wfo in all_wfos]
    to_render = {
        "wfo": wfo.upper(),
        "afd": afd_data,
        "wfo_list": wfo_combo_box_data,
        "version_list": afd_references
    }
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
