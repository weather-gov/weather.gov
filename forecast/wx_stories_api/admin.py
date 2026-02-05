from django.contrib import admin

from wx_stories_api.models import (
    SituationReport,
    TemporaryImage,
    TemporaryPDF,
    WeatherStory,
)

admin.site.register(SituationReport)
admin.site.register(WeatherStory)
admin.site.register(TemporaryPDF)
admin.site.register(TemporaryImage)
