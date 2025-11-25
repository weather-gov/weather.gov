import json

from django.test import TestCase

from backend.templatetags import util


class TestTemplateTagUtilities(TestCase):
    """Test template tag utilities."""

    def test_item_at_index_with_no_list(self):
        """Tests that we get None if the subject is not a list."""
        self.assertEquals(util.item_at_index("hello", 13), None)

    def test_item_at_index_with_invalid_index(self):
        """Tests that we get None if the index is not an integer."""
        self.assertEquals(util.item_at_index([1, 2, 3], "two"), None)

    def test_item_at_index_with_index_out_of_bounds(self):
        """Tests that we get None if the index is out of bounds."""
        self.assertEquals(util.item_at_index([1, 2, 3], 3), None)

    def test_item_at_index_with(self):
        """Tests that we get the item at the index in the list."""
        self.assertEquals(util.item_at_index([1, 2, 3], 1), 2)

    def test_subtract_with_first_empty(self):
        """Tests that an empty string is coerced to zero."""
        self.assertEquals(util.subtract("", 7), -7)

    def test_subtract_with_second_empty(self):
        """Tests that an empty string is coerced to zero."""
        self.assertEquals(util.subtract(9, ""), 9)

    def test_subtract(self):
        """Tests that a strings are coerced to floats."""
        self.assertEquals(util.subtract("13", 4), 9)

    def test_place_label_with_no_state(self):
        """Tests that we don't include a state if there's not one."""
        self.assertEquals(util.place_label({"name": "Townsville"}), "Townsville")

    def test_place_label_with_state(self):
        """Tests that we include state if present."""
        self.assertEquals(
            util.place_label({"name": "Townsville", "state": "PL"}),
            "Townsville, PL",
        )

    def test_json_encode_with_bad_type(self):
        """Tests that JSON encoding anything other than a dict or list results in an empty string."""
        self.assertEquals(util.json_encode("They're coming to get you, Barbara"), "")

    def test_json_encode(self):
        """Tests that JSON encoding... encodes."""
        # Use the json.dumps method here to get our expected output. Don't hard
        # code the expected string as that relies on the internal behavior of
        # json.dumps, which could change.
        o = {"key": "value"}
        self.assertEquals(util.json_encode(o), json.dumps(o))

    def test_normalize_alert_whitespace(self):
        """Test alert whitespace normalization."""
        actual = util.normalize_alert_whitespace("This is\nsome text\nin an\nalert")
        self.assertEquals(actual, "This is<br />some text<br />in an<br />alert")

    def test_template_zip(self):
        """Test that the zip filter zips things."""
        actual = util.template_zip([1, 2, 3], ["a", "b", "c"])
        self.assertEqual(list(actual), [(1, "a"), (2, "b"), (3, "c")])
