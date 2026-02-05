from unittest import mock

from django.test import TestCase

from backend.models import (
    WFO,
    DynamicSafetyInformation,
    HazardousWeatherOutlookLevels,
    HazardousWeatherOutlookMetadata,
    Region,
)
from backend.templatetags import weather_partials


class TestWeatherPartials(TestCase):
    """Tests the weather partials."""

    def setUp(self):
        """Set up the test data needed for each test."""
        wfo = WFO.objects.create(code="TST", name="Test", region=Region.objects.create(name="Test"))
        # Default extreme cold
        cold = HazardousWeatherOutlookMetadata.objects.get(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold, wfo=None
        )
        cold.basis = "Lips go brr"
        cold.save()

        # Delete the defaults that come in via migration, then add our own.
        HazardousWeatherOutlookLevels.objects.filter(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
        ).delete()
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=0,
            label="Warm",
            description="It's actually not cold at all.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=1,
            label="Nippy",
            description="Your ears will hurt.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=2,
            label="Cold",
            description="Two pairs of socks.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=3,
            label="Very cold",
            description="The Detroit Lions have appeared in the Super Bowl.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=4,
            label="YIKES",
            description="The Detroit Lions have won the Super Bowl.",
        )
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=None,
            number=5,
            label="All stop",
            description="Absolute zero achieved.",
        )

        # Now some WFO-specific metadata, to test merging.
        HazardousWeatherOutlookLevels.objects.create(
            type=HazardousWeatherOutlookMetadata.Keys.extreme_cold,
            wfo=wfo,
            number=3,
            label="Very cool",
            description="Cooler than a penguin's tuxedo",
        )

    def test_daily_high_low_one_period_daytime(self):
        """Tests a single daytime period."""
        expected = {"high": 3, "low": 3, "show_high": True, "show_low": False}

        actual = weather_partials.daily_high_low(
            periods=[
                {
                    "isDaytime": True,
                    "data": {
                        "temperature": {"degF": 3},
                    },
                },
            ],
        )

        self.assertEqual(actual, expected)

    def test_daily_high_low_one_period_not_daytime(self):
        """Tests a single nighttime or overnight period."""
        expected = {"high": 6, "low": 6, "show_high": False, "show_low": True}

        actual = weather_partials.daily_high_low(
            periods=[
                {
                    "isDaytime": False,
                    "data": {
                        "temperature": {"degF": 6},
                    },
                },
            ],
        )

        self.assertEqual(actual, expected)

    def test_daily_high_low_multiple_periods(self):
        """Tests multiple periods."""
        expected = {"high": 19, "low": -4, "show_high": True, "show_low": True}

        actual = weather_partials.daily_high_low(
            periods=[
                {
                    "isDaytime": True,
                    "data": {
                        "temperature": {"degF": -4},
                    },
                },
                {
                    "isDaytime": False,
                    "data": {
                        "temperature": {"degF": 19},
                    },
                },
            ],
        )

        self.assertEqual(actual, expected)

    def test_daily_high_low_null_temp_last_period(self):
        """Test high low if last period has null temp."""
        expected = { "high": 19, "low": -4, "show_high": True, "show_low": True }

        actual = weather_partials.daily_high_low(
            periods=[
                {
                    "isDaytime": True,
                    "data": {
                        "temperature": {"degF": -4},
                    },
                },
                {
                    "isDaytime": False,
                    "data": {
                        "temperature": {"degF": 19},
                    },
                },
                {
                    "isDaytime": False,
                    "data": {
                        "temperature": {"degF": None},
                    },
                }
            ],
        )

        self.assertEqual(actual, expected)

    def test_alert_link(self):
        """Tests the alert_link method."""
        alert = {
            "id": "alert id",
            "event": "boom boom",
            "level": "secret cow",
        }
        expected = {
            "alertCount": 1,
            "alert": alert,
            "alertId": "alert id",
            "alertType": "boom boom",
            "alertLevel": "secret cow",
        }

        actual = weather_partials.alert_link(alert=alert)

        self.assertEqual(actual, expected)

    def test_summary_alert_link_no_alerts(self):
        """Tests the summary alert link when there are no alerts."""
        actual = weather_partials.summary_alert_link(
            alerts={
                "metadata": {"count": 0},
            },
        )
        self.assertEqual(actual, {})

    def test_summary_alert_link_one_alert(self):
        """Tests the summary alert link when there is one alert."""
        actual = weather_partials.summary_alert_link(
            alerts={
                "metadata": {"count": 1},
                "items": [
                    {
                        "id": "alert id",
                        "event": "panic",
                        "level": "at the disco",
                    },
                ],
            },
        )
        self.assertEqual(
            actual,
            {
                "alertID": "alert id",
                "alertType": "panic",
                "alertLevel": "at the disco",
                "alertCount": 1,
            },
        )

    @mock.patch("backend.templatetags.weather_partials._")
    def test_summary_alert_link_multiple_alerts(self, mock_gettext_lazy):
        """Tests the summary alert link when there are multiple alerts."""
        mock_gettext_lazy.return_value = "bippity boppity boop"
        actual = weather_partials.summary_alert_link(
            alerts={
                "metadata": {
                    "count": 2,
                    "highest": "uppest",
                },
                "items": [
                    {
                        "id": "alert #1",
                        "event": "smoke",
                        "level": "on the water",
                    },
                    {
                        "id": "alert #1",
                        "event": "fire",
                        "level": "in the sky",
                    },
                ],
            },
        )

        mock_gettext_lazy.assert_called_with("daily-forecast.labels.multiple-alerts.01")

        self.assertEqual(
            actual,
            {
                "alertID": None,
                "alertType": "bippity boppity boop",
                "alertLevel": "uppest",
                "alertCount": 2,
            },
        )

    def test_daily_forecast_list_item_first(self):
        """Tests the daily forecast list item for the first entity."""
        day = {"periods": [{"dayName": "Twosday"}]}
        actual = weather_partials.daily_forecast_list_item(day=day, first=True)
        self.assertEqual(actual, {"day": day, "first": True})

    def test_daily_forecast_list_item_not_first(self):
        """Tests the daily forecast list item for a non-first item."""
        day = {"periods": [{"dayName": "Twosday"}]}
        actual = weather_partials.daily_forecast_list_item(day=day)
        self.assertEqual(actual, {"day": day, "first": False})

    def test_daily_summary_list_item(self):
        """Tests the daily summary list item."""
        day = {
            "dayLabel": "Foursday",
            "hours": "heyo",
            "itemId": "boop",
            "alerts": "a list",
            "hourly": {
                "times": "hour list",
                "temps": "some degrees",
                "feelsLike": "other degrees",
            },
        }
        actual = weather_partials.daily_summary_list_item(day=day)
        self.assertEqual(
            actual,
            {
                "day": day,
                "dayHours": "heyo",
                "itemId": "boop",
                "alerts": "a list",
                "times": "hour list",
                "temps": "some degrees",
                "feelsLike": "other degrees",
            },
        )

    @mock.patch("backend.templatetags.weather_partials._")
    def test_wind_speed_no_mph_no_direction(self, mock_gettext_lazy):
        """Test wind speed when there is no mph and no direction."""
        mock_gettext_lazy.return_value = "i18n string"
        actual = weather_partials.wind_speed_direction(speed={}, direction={})

        mock_gettext_lazy.assert_not_called()
        self.assertEqual(
            actual,
            {
                "speed": {},
                "direction": {},
                "has_speed": False,
                "has_direction": False,
                "sr_content": "",
            },
        )

    @mock.patch("backend.templatetags.weather_partials._")
    def test_wind_speed_no_mph_empty_direction(self, mock_gettext_lazy):
        """Test wind speed when there is no mph and direction is empty."""
        mock_gettext_lazy.return_value = "i18n string"
        actual = weather_partials.wind_speed_direction(speed={}, direction={"cardinalLong": None})

        mock_gettext_lazy.assert_not_called()
        self.assertEqual(
            actual,
            {
                "speed": {},
                "direction": {"cardinalLong": None},
                "has_speed": False,
                "has_direction": False,
                "sr_content": "",
            },
        )

    @mock.patch("backend.templatetags.weather_partials._")
    def test_wind_speed_no_mph_blank_direction(self, mock_gettext_lazy):
        """Test wind speed when there is no mph and the direction is a blank string."""
        mock_gettext_lazy.return_value = "i18n string"
        actual = weather_partials.wind_speed_direction(speed={}, direction="")

        mock_gettext_lazy.assert_not_called()
        self.assertEqual(
            actual,
            {
                "speed": {},
                "direction": "",
                "has_speed": False,
                "has_direction": False,
                "sr_content": "",
            },
        )

    @mock.patch("backend.templatetags.weather_partials._")
    def test_wind_speed_no_mph(self, mock_gettext_lazy):
        """Test wind speed when there is no mph."""
        mock_gettext_lazy.return_value = "i18n string"
        actual = weather_partials.wind_speed_direction(speed={}, direction={"cardinalLong": "north"})

        mock_gettext_lazy.assert_not_called()
        self.assertEqual(
            actual,
            {
                "speed": {},
                "direction": {"cardinalLong": "north"},
                "has_speed": False,
                "has_direction": True,
                "sr_content": "",
            },
        )

    @mock.patch("backend.templatetags.weather_partials._")
    def test_wind_speed_mph_is_empty(self, mock_gettext_lazy):
        """Test wind speed when mph is none."""
        mock_gettext_lazy.return_value = "i18n string"
        actual = weather_partials.wind_speed_direction(
            speed={"mph": None},
            direction={"cardinalLong": "north"},
        )

        mock_gettext_lazy.assert_not_called()
        self.assertEqual(
            actual,
            {
                "speed": {"mph": None},
                "direction": {"cardinalLong": "north"},
                "has_speed": False,
                "has_direction": True,
                "sr_content": "",
            },
        )

    @mock.patch("backend.templatetags.weather_partials._")
    def test_wind_speed_mph_is_blank(self, mock_gettext_lazy):
        """Test wind speed mph is an empty string."""
        mock_gettext_lazy.return_value = "i18n string"
        actual = weather_partials.wind_speed_direction(
            speed={"mph": ""},
            direction={"cardinalLong": "north"},
        )

        mock_gettext_lazy.assert_not_called()
        self.assertEqual(
            actual,
            {
                "speed": {"mph": ""},
                "direction": {"cardinalLong": "north"},
                "has_speed": False,
                "has_direction": True,
                "sr_content": "",
            },
        )

    @mock.patch("backend.templatetags.weather_partials._")
    def test_wind_speed_with_speed_and_direction(self, mock_gettext_lazy):
        """Test wind speed when we have both speed and direction."""
        mock_gettext_lazy.return_value = "text {speed} text"
        actual = weather_partials.wind_speed_direction(
            speed={"mph": 32},
            direction={"cardinalLong": "north"},
        )

        mock_gettext_lazy.assert_called_with("wind.labels.speed-from-north.01")
        self.assertEqual(
            actual,
            {
                "speed": {"mph": 32},
                "direction": {"cardinalLong": "north"},
                "has_speed": True,
                "has_direction": True,
                "sr_content": "text 32 text",
            },
        )

    def test_radar(self):
        """Tests the radar partial."""
        actual = weather_partials.radar(place="Bob's", point="Burgers", radar_metadata="ping? PONG!")
        self.assertEqual(
            actual,
            {
                "place": "Bob's",
                "point": "Burgers",
                "radar_metadata": "ping? PONG!",
                "intensities": weather_partials.RADAR_INTENSITIES,
                "heading_level": "h2",
                "heading_class": None,
            },
        )

    def test_quick_forecast_link_item_first(self):
        """Tests the quick forecast link item partial."""
        actual = weather_partials.quick_forecast_link_item(day="Friesday", first=True)
        self.assertEqual(actual, {"day": "Friesday", "first": True})

    def test_quick_forecast_link_item_not_first(self):
        """Tests the quick forecast link item partial."""
        actual = weather_partials.quick_forecast_link_item(day="Friesday")
        self.assertEqual(actual, {"day": "Friesday", "first": False})

    def test_hourly_table(self):
        """Tests the hourly table partial."""
        day = {"this key": "is preserved", "alerts": {"items": "a list of alerts"}}
        actual = weather_partials.hourly_table(day=day)
        self.assertEqual(
            actual,
            {
                "this key": "is preserved",
                "alerts": "a list of alerts",
            },
        )

    def test_hourly_charts(self):
        """Tests the hourly charts partial."""
        day = {
            "this key": "goes away",
            "id": "Caturday",
            "hourly": {"but this one": "sticks around"},
            "qpf": "liquid from the sky",
        }
        actual = weather_partials.hourly_charts(day=day, hours="twenty fourish")
        self.assertEqual(
            actual,
            {
                "but this one": "sticks around",
                "itemId": "Caturday",
                "hours": "twenty fourish",
                "qpf": "liquid from the sky",
            },
        )

    def test_forecast_quick_toggle(self):
        """Tests the forecast quick partial."""
        actual = weather_partials.daily_forecast_quick_toggle(day={"day": "Shunday"}, first=True)
        self.assertEqual(actual, {"day": "Shunday", "first": True})

    def test_precip_table_with_undefined_table(self):
        """Tests the precip table partial with default as_table."""
        actual = weather_partials.precip_table(qpf={"key": "kept"})
        self.assertEqual(actual, {"key": "kept", "as_table": True})

    def test_precip_table_with_set_table(self):
        """Tests the precip table partial with defined as_table."""
        actual = weather_partials.precip_table(qpf={"key": "kept"}, as_table=False)
        self.assertEqual(actual, {"key": "kept", "as_table": False})

    def test_dynamic_safety_info_no_match(self):
        """Tests getting dynamic safety info if we don't have any."""
        actual = weather_partials.dynamic_safety_information("big bad wolf")
        self.assertEqual(actual, None)

    def test_dynamic_safety_info(self):
        """Tests getting dynamic safety info."""
        DynamicSafetyInformation(
            type="big bad wolf",
            label="Huff and Puff",
            body="This is the body<script>with illegal stuff</script>.",
        ).save()
        actual = weather_partials.dynamic_safety_information("Big Bad Wolf")
        self.assertEqual(
            actual,
            {"body": "This is the body.", "type": "big bad wolf"},
        )

    def test_icon_with_no_attributes(self):
        """Tests icons with no attributes."""
        actual = weather_partials.weather_icon(
            icon_name="Fred",
            size="lg",
            color_mode="RGB",
        )
        self.assertEqual(
            actual,
            {
                "icon_name": "Fred_lg_RGB",
                "size": "lg",
                "color_mode": "RGB",
                "attrs": {"role": "img"},
            },
        )

    def test_icon_with_attributes(self):
        """Tests icons with some attributes."""
        actual = weather_partials.weather_icon(
            icon_name="Barney",
            size="xl",
            color_mode="HSL",
            # This becomes an attribute
            rando="key",
            # This has its underscore replaced with a dash
            with_underscore="yes hahaha yessss",
            # This gest appended to the existing "role" attribute
            role="producer",
        )
        self.assertEqual(
            actual,
            {
                "icon_name": "Barney_xl_HSL",
                "size": "xl",
                "color_mode": "HSL",
                "has_attrs": True,
                "attrs": {
                    "role": "img producer",
                    "rando": "key",
                    "with-underscore": "yes hahaha yessss",
                },
            },
        )
