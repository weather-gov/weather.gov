from django.conf import settings
from django.contrib import auth
from django.shortcuts import redirect
from django.views.decorators.http import require_POST


@require_POST
def cms_logout(request):  #noqa D103
    if settings.SAML_LOCAL_DEV:
        auth.logout(request)
        return redirect("/cms/login/")
    return redirect("/saml/logout/")
