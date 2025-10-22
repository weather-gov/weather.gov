from django.contrib import admin

from backend.models import (
    WFO,
    DynamicSafetyInformation,
    GenericPage,
    NOAAUser,
    Region,
)

admin.site.register(GenericPage)
admin.site.register(Region)
admin.site.register(WFO)
admin.site.register(DynamicSafetyInformation)
admin.site.register(NOAAUser)
