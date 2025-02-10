from os import getenv
import requests

def _fetch(url):
    """
    Basic request function for handling all interop layer
    requests
    """
    base_url = getenv("INTEROP_URL")
    full_url = f"{base_url}{url}"
    response = requests.get(full_url)
    response.raise_for_status()
    return response.json()

def get_point_forecast(lat, lon):
    url = f"/point/{lat}/{lon}"
    return _fetch(url)

def get_wx_afd_by_id(afd_id):
    url = f"/products/{afd_id}"
    return _fetch(url)
