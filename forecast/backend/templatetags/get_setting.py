from django import template
from django.conf import settings
from django.utils.html import json_script

register = template.Library()


@register.simple_tag
def third_party_site_list():
    """Return a simple list of 3rd party sites we need to function."""
    sites = getattr(settings, "CRITICAL_HOSTS", "")
    flatten = list({site for group in sites.values() for site in group})
    return json_script(flatten, "third-party-site-list")
