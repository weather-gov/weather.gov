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

def _api_fetch(url):
    """
    Fetch directly through the weather API or the
    proxy, if present
    """
    base_url = getenv("API_URL")
    if not base_url or base_url == "":
        base_url = "https://api.weather.gov/"
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

def get_wx_afd_versions_by_wfo(wfo):
    url = f"/products/types/AFD/locations/{wfo}"
    return _api_fetch(url)

def get_wx_afd_versions():
    url = f"/products/types/AFD"
    return _api_fetch(url)
