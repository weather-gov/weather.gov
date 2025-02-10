from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("point/<lat>/<lon>", views.point_location, name="point"),
    path("offices", views.offices, name="offices"),
    # path("afd", views.afd_index, name="afd_index"),
    # path("afd/<wfo>/<afd_id>", views.afd_by_wfo_and_id, name="afd_by_wfo_and_id")
    path("afd/", views.afd_index, name="afd_index"),
    path("afd/<wfo>", views.afd_by_office, name="afd_by_office"),
    path("afd/<wfo>/<afd_id>", views.afd_by_office_and_id, name="afd_by_office_and_id"),

    # WX routes are those that return partial HTML markup
    # that will be requested from the frontend (htmx style)
    path("wx/afd/<afd_id>", views.wx_afd_id, name="wx_afd_id"),
    path("wx/afd/locations/<wfo>", views.wx_afd_versions, name="wx_afd_versions"),
]
