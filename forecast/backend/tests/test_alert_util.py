from unittest import mock
from zoneinfo import ZoneInfo

from django.test import TestCase
from freezegun import freeze_time

from backend.util.alert import set_timing


class TestAlertUtilities(TestCase):
    """Tests our alert utilities."""

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_active_alert_ending_later_today(self, mock_gettext_lazy):
        """Test an active alert that ends later the same day."""
        mock_gettext_lazy.return_value = "boop boop {time} boop boop"
        alert = {"onset": "2024-09-01T06:00:00-05:00", "finish": "2024-09-01T10:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "boop boop 10:00 AM boop boop")
        mock_gettext_lazy.assert_called_with("until {time} today")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_active_alert_ending_after_today(self, mock_gettext_lazy):
        """Test an active alert that ends after today."""
        mock_gettext_lazy.return_value = "womp {time} womp"
        alert = {"onset": "2024-09-01T06:00:00-05:00", "finish": "2024-09-02T10:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "womp Monday 09/02 10:00 AM womp")
        mock_gettext_lazy.assert_called_with("until {time}")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_active_alert_with_unknown_ending(self, mock_gettext_lazy):
        """Test an active alert with an unknown end time."""
        mock_gettext_lazy.return_value = "effect in is"
        alert = {"onset": "2024-09-01T06:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "effect in is")
        mock_gettext_lazy.assert_called_with("is in effect")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_alert_ended(self, mock_gettext_lazy):
        """Test an alert that is ended."""
        mock_gettext_lazy.return_value = "it is finished"
        alert = {"onset": "2024-09-01T06:00:00-05:00", "finish": "2024-09-01T07:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "it is finished")
        mock_gettext_lazy.assert_called_with("has concluded")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_pending_alert_later_this_morning(self, mock_gettext_lazy):
        """Test a future alert that starts in the morning of the current day."""
        mock_gettext_lazy.return_value = "wake {day} up"
        alert = {"onset": "2024-09-01T09:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "wake this up")
        mock_gettext_lazy.assert_called_with("{day} morning")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_pending_alert_later_this_afternoon(self, mock_gettext_lazy):
        """Test a future alert that starts in the afternoon of the current day."""
        mock_gettext_lazy.return_value = "siesta {day}"
        alert = {"onset": "2024-09-01T14:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "siesta this")
        mock_gettext_lazy.assert_called_with("{day} afternoon")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_pending_alert_later_tonight(self, mock_gettext_lazy):
        """Test a future alert that starts in the evening of the current day."""
        mock_gettext_lazy.return_value = "go to bed"
        alert = {"onset": "2024-09-01T19:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "go to bed")
        mock_gettext_lazy.assert_called_with("tonight")

    @freeze_time("2024-09-01T18:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_pending_alert_later_tomorrow_morning_less_than_24_hours(self, mock_gettext_lazy):
        """
        Test an alert that starts tomorrow morning, but less than 24 hours from now.

        This is to capture a specific bug where "tomorrow" was being evaluated
        as simply 24 hours from "now" rather than midnight of the next day.
        """
        mock_gettext_lazy.return_value = "when {day} then"
        alert = {"onset": "2024-09-02T03:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "when tomorrow then")
        mock_gettext_lazy.assert_called_with("{day} morning")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_pending_alert_later_tomorrow_morning(self, mock_gettext_lazy):
        """Test a future alert that starts in the morning of the next day."""
        mock_gettext_lazy.return_value = "procr{day}astinate"
        alert = {"onset": "2024-09-02T09:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "procrtomorrowastinate")
        mock_gettext_lazy.assert_called_with("{day} morning")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_pending_alert_later_tomorrow_afternoon(self, mock_gettext_lazy):
        """Test a future alert that starts in the afternoon of the next day."""
        mock_gettext_lazy.return_value = "lunch {day} date"
        alert = {"onset": "2024-09-02T14:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "lunch tomorrow date")
        mock_gettext_lazy.assert_called_with("{day} afternoon")

    @freeze_time("2024-09-01T08:00:00-05:00")
    @mock.patch("backend.util.alert._")
    def test_pending_alert_later_tomorrow_night(self, mock_gettext_lazy):
        """Test a future alert that starts in the evening of the next day."""
        mock_gettext_lazy.return_value = "theatre"
        alert = {"onset": "2024-09-02T19:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "theatre")
        mock_gettext_lazy.assert_called_with("tomorrow night")

    @freeze_time("2024-09-01T08:00:00-05:00")
    def test_pending_alert_in_the_further_future(self):
        """Test a future alert that starts after tomorrow."""
        alert = {"onset": "2024-09-03T08:00:00-05:00"}
        set_timing(alert, ZoneInfo("America/Chicago"))
        self.assertEqual(alert["duration"], "Tuesday")
