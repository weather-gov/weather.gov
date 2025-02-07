from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    # path("^/point/(?P<lat>[-]?[0-9]+[.][0-9]+)/(?P<lon>[-]?[0-9]+[.][0-9]+)/?$", views.point_location, name="point"),
    path("point/<lat>/<lon>", views.point_location, name="point"),
]
