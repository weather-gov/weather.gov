from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("point/<lat>/<lon>", views.point_location, name="point"),
    path("offices", views.offices, name="offices"),
    # path("afd", views.afd_index, name="afd_index"),
    # path("afd/<wfo>", views.afd_by_wfo, name="afd_by_wfo"),
    # path("afd/<wfo>/<afd_id>", views.afd_by_wfo_and_id, name="afd_by_wfo_and_id")
]
