from os import getenv
import requests
from weather import interop
from django.http import HttpResponse
from django.shortcuts import render
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
    """

def afd_by_office(request, wfo):
    """
    Will determine the most recent AFD for the given
    WFO office and redirect the user to the correct
    url for that product
    """

def afd_by_office_and_id(request, wfo, afd_id):
    """
    Will display the given AFD product by id
    and populate the list of available AFDs for
    the provided WFO
    """

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
