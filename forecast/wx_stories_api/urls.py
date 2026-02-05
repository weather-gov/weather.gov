from django.urls import path

from . import views

urlpatterns = [
    path("node/wfo_pdf_upload/field_wfo_sitrep", views.pdf, name="pdf-upload"),
    path("node/wfo_pdf_upload", views.situation_report, name="create-daily-situation-report"),
    path("node/wfo_weather_story_upload/field_fullimage", views.image, {"size": "F"}, name="image-upload"),
    path("node/wfo_weather_story_upload/field_smallimage", views.image, {"size": "S"}, name="image-upload-small"),
    path("node/wfo_weather_story_upload", views.weather_story, name="create-weather-story"),
]
