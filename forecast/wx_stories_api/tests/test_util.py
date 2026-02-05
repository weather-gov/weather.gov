import uuid
from unittest import mock

from django.test import RequestFactory, TestCase

from wx_stories_api.util import get_filename_from_header, get_temporary_id


class TestUtil(TestCase):
    """Test utility & helper functions."""

    def setUp(self):
        """Test setup."""
        self.factory = RequestFactory()

    def test_get_filename_from_header_easy(self):
        """Test that an easy filename is found."""
        headers = {"Content-Disposition": 'attachment; filename="image.jpg"'}
        expected = "image.jpg"
        actual = get_filename_from_header(self.factory.get("/", headers=headers))
        self.assertEqual(expected, actual)

    def test_get_filename_from_header_none(self):
        """Test that an empty string is returned when no filename exists."""
        headers = {"Content-Disposition": "attachment; filename="}
        expected = ""
        actual = get_filename_from_header(self.factory.get("/", headers=headers))
        self.assertEqual(expected, actual)
        headers = {"Content-Disposition": "inline"}
        expected = ""
        actual = get_filename_from_header(self.factory.get("/", headers=headers))
        self.assertEqual(expected, actual)

    @mock.patch("wx_stories_api.util.uuid")
    def test_get_temporary_id_with_defaults(self, mock_uuid):
        """Test that a png is returned with a given uuid."""
        _uuid = "a163e025-0b19-47f1-8b37-62aa87709dca"
        mock_uuid.uuid4.return_value = uuid.UUID(_uuid)
        expected_id = uuid.UUID(_uuid)
        expected_filename = "a163e0250b1947f18b3762aa87709dca.png"
        actual_id, actual_filename = get_temporary_id()
        self.assertEqual(expected_id, actual_id)
        self.assertEqual(expected_filename, actual_filename)

    @mock.patch("wx_stories_api.util.uuid")
    def test_get_temporary_id_with_parms(self, mock_uuid):
        """Test that a pdf is returned with a given uuid."""
        _uuid = "a163e025-0b19-47f1-8b37-62aa87709dca"
        mock_uuid.uuid4.return_value = uuid.UUID(_uuid)
        expected_id = uuid.UUID(_uuid)
        expected_filename = "pre_a163e0250b1947f18b3762aa87709dca.pdf"
        actual_id, actual_filename = get_temporary_id("org.pdf", "pre", "tiff")
        self.assertEqual(expected_id, actual_id)
        self.assertEqual(expected_filename, actual_filename)
