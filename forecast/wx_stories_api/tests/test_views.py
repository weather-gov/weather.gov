import json
import uuid
from os import path
from tempfile import mkdtemp
from unittest import mock

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from requests.auth import _basic_auth_str

from backend.models import WFO, NOAAUser, Region
from backend.util import disable_logging_for_quieter_tests
from wx_stories_api.models import SituationReport, TemporaryImage, TemporaryPDF, WeatherStory


@override_settings(MEDIA_ROOT=(mkdtemp()))
class TestWxStoryApiViews(TestCase):
    """Tests our weather story api views."""

    @classmethod
    def setUpTestData(cls):
        """Test setup. Only for records that will not be modified."""
        cls.region = Region.objects.create(name="Test Region")
        cls.wfo = WFO.objects.create(code="QQQ", name="Test WFO", region=cls.region)
        cls.user = NOAAUser.objects.create_user("uploader", "fake@example.com", "uploader")

    def setUp(self):
        """Test setup."""
        with open(path.join(path.dirname(__file__), "data/sample_wx_story.json")) as f:
            self.sample_wx_story = json.load(f)
        with open(path.join(path.dirname(__file__), "data/sample_sitrep.json")) as f:
            self.sample_sitrep = json.load(f)

    @disable_logging_for_quieter_tests
    def test_pdf(self):
        """Test uploading a PDF."""
        response = self.client.post(
            "/jsonapi/node/wfo_pdf_upload/field_wfo_sitrep",
            data=b"Mock pdf file contents",
            headers={
                "Authorization": _basic_auth_str("uploader", "uploader"),
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/octet-stream",
                "Content-Disposition": 'file; filename="fullimage1.png"',
            },
            content_type="application/octet-stream",
        )
        self.assertEqual(response.status_code, 201)
        _id = response.json()["data"]["id"]
        self.assertEqual(TemporaryPDF.objects.filter(id=_id).count(), 1)

    @disable_logging_for_quieter_tests
    @mock.patch("wx_stories_api.views.SituationReport.objects.prune")
    def test_situation_report(self, mock_prune):
        """Test a basic situation report creation."""
        pdf = ContentFile(b"pdf for testing", name="sitrep.pdf")
        pid = uuid.UUID("d4b4fb36-e878-431e-a036-13b2d758880f")
        TemporaryPDF(id=pid, file=pdf).save()
        self.sample_sitrep["data"]["relationships"]["field_wfo_sitrep"]["data"]["id"] = str(pid)

        response = self.client.post(
            "/jsonapi/node/wfo_pdf_upload",
            data=self.sample_sitrep,
            headers={
                "Authorization": _basic_auth_str("uploader", "uploader"),
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            content_type="application/vnd.api+json",
        )
        self.assertEqual(response.status_code, 201)

        # returns a json response
        self.assertEqual(type(response.json()["data"]["id"]), str)

        # creates weather story with expected values
        sitrep = SituationReport.objects.get(wfo=self.wfo)
        self.assertEqual(sitrep.pdf.file.read(), b"pdf for testing")

        # calls prune()
        mock_prune.assert_called_once()

        # deletes temp pdf
        self.assertFalse(TemporaryPDF.objects.filter(id=pid).exists())

    @disable_logging_for_quieter_tests
    def image(self):
        """Test uploading an image."""
        response = self.client.post(
            "/jsonapi/node/wfo_weather_story_upload/field_fullimage",
            data=b"Mock image file contents",
            headers={
                "Authorization": _basic_auth_str("uploader", "uploader"),
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/octet-stream",
                "Content-Disposition": 'file; filename="fullimage1.png"',
            },
            content_type="application/octet-stream",
        )
        self.assertEqual(response.status_code, 201)
        _id = response.json()["data"]["id"]
        self.assertEqual(TemporaryImage.objects.filter(id=_id).count(), 1)

    @disable_logging_for_quieter_tests
    @mock.patch("wx_stories_api.views.WeatherStory.objects.prune")
    def test_weather_story(self, mock_prune):
        """Test a basic weather story creation."""
        small = ContentFile(b"small image for testing", name="small.png")
        full = ContentFile(b"full image for testing", name="full.png")
        fid, sid = uuid.UUID("d4b4fb36-e878-431e-a036-13b2d758880f"), uuid.UUID("8c0936f3-9df8-4796-92e6-77f9e647027c")
        TemporaryImage(id=sid, image=small).save()
        TemporaryImage(id=fid, image=full).save()
        self.sample_wx_story["data"]["relationships"]["field_fullimage"]["data"]["id"] = str(fid)
        self.sample_wx_story["data"]["relationships"]["field_smallimage"]["data"]["id"] = str(sid)
        # test longer wfo codes, because some of them are 4 letters
        self.sample_wx_story["data"]["attributes"]["field_office"] = "AQQQA"

        response = self.client.post(
            "/jsonapi/node/wfo_weather_story_upload",
            data=self.sample_wx_story,
            headers={
                "Authorization": _basic_auth_str("uploader", "uploader"),
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            content_type="application/vnd.api+json",
        )
        self.assertEqual(response.status_code, 201)

        # returns a json response
        self.assertEqual(type(response.json()["data"]["id"]), str)

        # creates weather story with expected values
        wx_story = WeatherStory.objects.get(wfo=self.wfo)
        self.assertEqual(wx_story.small.file.read(), b"small image for testing")
        self.assertEqual(wx_story.image.file.read(), b"full image for testing")

        # calls prune()
        mock_prune.assert_called_once()

        # deletes temp images
        self.assertFalse(TemporaryImage.objects.filter(id=sid).exists())
        self.assertFalse(TemporaryImage.objects.filter(id=fid).exists())

    @disable_logging_for_quieter_tests
    def test_weather_story_cannot_get(self):
        """Test weather story endoint does not accept GET requests."""
        response = self.client.get(
            "/jsonapi/node/wfo_weather_story_upload",
            headers={
                "Authorization": _basic_auth_str("uploader", "uploader"),
            },
        )
        self.assertEqual(response.status_code, 405)

    @disable_logging_for_quieter_tests
    def test_weather_story_rejects_malformed_data(self):
        """Test weather story endoint raises for bad requests."""
        self.sample_wx_story["data"]["attributes"]["field_office"] = "AAA"
        response = self.client.post(
            "/jsonapi/node/wfo_weather_story_upload",
            data=self.sample_wx_story,
            headers={
                "Authorization": _basic_auth_str("uploader", "uploader"),
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            content_type="application/vnd.api+json",
        )
        self.assertEqual(response.status_code, 400)

    @disable_logging_for_quieter_tests
    def test_weather_story_works_without_small_image(self):
        """Test weather story without a small image."""
        full = ContentFile(b"full image for testing", name="full.png")
        fid = uuid.UUID("d4b4fb36-e878-431e-a036-13b2d758880f")
        TemporaryImage(id=fid, image=full).save()
        self.sample_wx_story["data"]["relationships"]["field_fullimage"]["data"]["id"] = str(fid)
        self.sample_wx_story["data"]["relationships"].pop("field_smallimage")

        response = self.client.post(
            "/jsonapi/node/wfo_weather_story_upload",
            data=self.sample_wx_story,
            headers={
                "Authorization": _basic_auth_str("uploader", "uploader"),
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            content_type="application/vnd.api+json",
        )
        self.assertEqual(response.status_code, 201)

    @disable_logging_for_quieter_tests
    def test_weather_story_rejects_missing_images(self):
        """Test weather story endoint raises for missing full image."""
        fid = uuid.UUID("d4b4fb36-e878-431e-a036-13b2d758880f")
        self.sample_wx_story["data"]["relationships"]["field_fullimage"]["data"]["id"] = str(fid)

        response = self.client.post(
            "/jsonapi/node/wfo_weather_story_upload",
            data=self.sample_wx_story,
            headers={
                "Authorization": _basic_auth_str("uploader", "uploader"),
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            },
            content_type="application/vnd.api+json",
        )
        self.assertEqual(response.status_code, 412)
