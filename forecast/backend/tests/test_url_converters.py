from django.test import TestCase

from backend.url_converters import FloatConverter


class TestUrlConverters(TestCase):
    """Test Django URL converters."""

    def setUp(self):
        """Test setup."""
        self.converter = FloatConverter()

    # PT027 recommends using pytest's "raises" wrapper which is honestly much
    # nicer looking. However, we don't currently have pytest installed and I
    # didn't want to add another dependency until we can separate our dev and
    # runtime dependencies for deployment. So I disabled that rule where it was
    # flagging. Sorry!

    def test_to_python_error_on_none(self):
        """Tests that the converter throws on None."""
        self.assertRaises(TypeError, self.converter.to_python, None)  # noqa: PT027

    def test_to_python_error_on_object(self):
        """Tests that the converter throws on object."""
        self.assertRaises(TypeError, self.converter.to_python, {})  # noqa: PT027

    def test_to_python_error_on_bad_string(self):
        """Tests that the converter throws on bad string."""
        self.assertRaises(ValueError, self.converter.to_python, "Just text")  # noqa: PT027

    def test_to_python(self):
        """Tests that the converter converts a floaty string to a float."""
        actual = self.converter.to_python("3.14159")
        self.assertEquals(actual, 3.14159)

    def test_to_url(self):
        """Tests that whatever we pass is also what comes out."""
        in_obj = {}
        actual = self.converter.to_url(in_obj)
        self.assertEquals(actual, in_obj)
