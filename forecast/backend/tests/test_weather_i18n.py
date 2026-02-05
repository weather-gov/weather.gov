import json
from unittest import mock

from django.test import TestCase

from backend.templatetags import weather_i18n


class TestTemplateTagWeatheri18n(TestCase):
    """Test template tag weather internationalization utilities."""

    @mock.patch("backend.templatetags.weather_i18n._")
    def test_t_with_no_args(self, mock_):
        """Test the t method with no additional arguments."""
        mock_.return_value = "Faker faker"
        actual = weather_i18n.t("this is text")
        mock_.assert_called_with("this is text")
        self.assertEquals(actual, "Faker faker")

    @mock.patch("backend.templatetags.weather_i18n._")
    def test_t_with_args(self, mock_):
        """Test the t method with arguments."""
        args = json.dumps([["{one}", "1"], ["{two}", "two"]])
        mock_.return_value = "This is {one} a string or {two}."

        actual = weather_i18n.t("this is text", args)
        mock_.assert_called_with("this is text")
        self.assertEquals(actual, "This is 1 a string or two.")

    @mock.patch("backend.templatetags.weather_i18n._")
    def test_trans_with_args_but_without_args(self, mock_):
        """Test trans_with_args method with no additional arguments."""
        mock_.return_value = "Yogi Bear"
        actual = weather_i18n.trans_with_args("this is text")
        mock_.assert_called_with("this is text")
        self.assertEquals(actual, "Yogi Bear")

    @mock.patch("backend.templatetags.weather_i18n._")
    def test_trans_with_args(self, mock_):
        """Test trans_with_args method with arguments."""
        mock_.return_value = "Yogi Bear and {hey}"
        actual = weather_i18n.trans_with_args("this is text", hey="boo boo")
        mock_.assert_called_with("this is text")
        self.assertEquals(actual, "Yogi Bear and boo boo")

    # @mock.patch("backend.templatetags.weather_i18n.ngettext")
    def test_translate_plural_with_args_but_without_args(self):
        """Test translate_plural_with_args method with no additional arguments."""
        # mock_ngettext.return_value = "Ranger Smith"
        actual = weather_i18n.translate_plural_with_args("Ranger Smith", 0)
        # mock_ngettext.assert_called_with("this is text")
        self.assertEquals(actual, "Ranger Smith-plural")

    def test_translate_plural_with_argss(self):
        """Test translate_plural_with_args method with arguments."""
        actual = weather_i18n.translate_plural_with_args(
            "Ranger Smith and {stolen_items}",
            1,
            stolen_items="Pick-a-nick Baskets",
        )
        self.assertEquals(actual, "Ranger Smith and Pick-a-nick Baskets")
