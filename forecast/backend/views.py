from os import getenv
import requests
from django.shortcuts import render


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
        
    
    
