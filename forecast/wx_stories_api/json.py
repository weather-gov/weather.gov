from uuid import uuid4

from django.http import JsonResponse

from wx_stories_api.responses import (
    file_upload_response,
    situation_report_response,
    weather_story_response,
)


class FakeDrupal:
    """
    Wrapper for JsonResponse which pretends to be Drupal.

    The sole and only reason for this class is in case our upstream partner
    is performing schema validation on our responses based on what we used
    to send from Drupal.

    Once we move to a new system for obtaining weather stories, all of this
    will hopefully become irrelvant.
    """

    def file_upload(self, uuid, original_filename):
        """Return the JSON response for a PDF or image upload."""
        return JsonResponse(file_upload_response(uuid, original_filename), status=201)

    def weather_story(self, data):
        """Return the JSON response for a weather story upload."""
        attr = data["data"]["attributes"]
        uuid = uuid4()
        return JsonResponse(weather_story_response(attr, uuid), status=201)

    def situation_report(self, data):
        """Return the JSON response for an situation report upload."""
        attr = data["data"]["attributes"]
        uuid = uuid4()
        return JsonResponse(situation_report_response(attr, uuid), status=201)
