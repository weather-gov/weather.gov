from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.saml_login, name="saml_login"),
    path("logout/", views.saml_logout, name="saml_logout"),
    path("acs", views.saml_acs, name="saml_acs"),
    path("sls", views.saml_sls, name="saml_sls"),
]
