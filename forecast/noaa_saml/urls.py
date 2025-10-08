from django.urls import path

from . import views

urlpatterns = [
    path("saml/login/", views.saml_login, name="saml_login"),
    path("saml/logout/", views.saml_logout, name="saml_logout"),
    path("saml/acs", views.saml_acs, name="saml_acs"),
    path("saml/sls", views.saml_sls, name="saml_sls"),
    path("saml/metadata/", views.saml_metadata, name="saml_metadata"),
]
