"""
URL configuration for weathergov project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from django.utils import timezone
from django.views.decorators.http import last_modified
from django.views.i18n import JavaScriptCatalog
from wagtail import urls as wagtail_urls

from backend.views import index

server_restart_date = timezone.now()

urlpatterns = [
    path("", index.index, name="index"),
    path("", include("backend.urls")),
    path("saml/", include("noaa_saml.urls")),
    path(
        "languages/jsi18n/",
        last_modified(lambda _, **kw: server_restart_date)(JavaScriptCatalog.as_view()),
        name="translation-strings-for-js",
    ),
    # If nothing else has matched anywhere, try Wagtail pages
    path("", include(wagtail_urls)),
]

# We need to add local media serving in non-prod
# environments where S3 is not used.
# This will allow uploaded assets like weather story images
# and sitrep pdfs to be served from the URLs their models are given
if settings.SETTINGS_TYPE != "production":
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Only add admin paths if we're using dev settings
if settings.SETTINGS_TYPE == "dev":
    from django.contrib import admin

    urlpatterns.append(
        path("admin/", admin.site.urls),
    )

    if not settings.TESTING:

        urlpatterns = [path("__debug__/", include("debug_toolbar.urls"))] + urlpatterns

handler404 = "backend.views.errors.handle_404"
