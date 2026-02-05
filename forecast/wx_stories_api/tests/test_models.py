from datetime import datetime, timedelta, timezone
from tempfile import mkdtemp
from unittest import mock

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings

from backend.models import WFO, Region
from wx_stories_api.models import SituationReport, WeatherStory


@override_settings(MEDIA_ROOT=(mkdtemp()))
class TestModels(TestCase):
    """Test Django models."""

    @classmethod
    def setUpTestData(cls):
        """Test setup. Only for records that will not be modified."""
        cls.region = Region.objects.create(name="FAKE REGION")
        cls.wfo = WFO.objects.create(name="Test Office", code="TST", region=cls.region)
        cls.other_wfo = WFO.objects.create(name="Another Test Office", code="TSQ", region=cls.region)
        cls.now = datetime.now(tz=timezone.utc)
        cls.img = ContentFile(b"small image for testing", name="small.png")
        cls.pdf = ContentFile(b"small pdf for testing", name="file.pdf")

    def test_situation_report_current_return(self):
        """Test that current returns the most recently created."""
        SituationReport.objects.create(title="Test1", pdf=self.pdf, wfo=self.wfo)
        SituationReport.objects.create(title="Test2", pdf=self.pdf, wfo=self.wfo)
        actual = SituationReport.objects.current(self.wfo)
        expected = SituationReport.objects.get(title="Test2")
        self.assertEqual(actual, expected)

    def test_situation_report_prune(self):
        """Test that prune prunes the oldest for that wfo and not more than the max."""
        for x in range(15):
            SituationReport.objects.create(title=f"Test{x}", pdf=self.pdf, wfo=self.wfo)
        for x in range(5):
            SituationReport.objects.create(title=f"Other{x}", pdf=self.pdf, wfo=self.other_wfo)
        SituationReport.objects.prune(self.wfo)
        actual = SituationReport.objects.count()
        expected = 19
        self.assertEqual(actual, expected)
        self.assertFalse(SituationReport.objects.filter(title="Test0").exists())

    def test_weather_story_current_return(self):
        """Test that current returns all currently active records."""
        expected = set()
        # current weather stories
        for x in range(5):
            story = WeatherStory.objects.create(
                title=f"TestCur{x}",
                image=self.img,
                wfo=self.wfo,
                starttime=self.now - timedelta(10 * (x + 1)),
                endtime=self.now + timedelta(10 * (x + 1)),
            )

            expected.add(story)

            # Make a story that was inserted somewhere in the middle into
            # the newest story. This will test that we're sorting them properly.
            if x == 2:  # noqa: PLR2004
                story.starttime = self.now - timedelta(1)
                story.save()
                first = story

        # expired weather stories
        for x in range(5):
            WeatherStory.objects.create(
                title=f"TestExp{x}",
                image=self.img,
                wfo=self.wfo,
                starttime=self.now - timedelta(4),
                endtime=self.now - timedelta(2),
            )
        # future weather stories
        for x in range(5):
            WeatherStory.objects.create(
                title=f"TestExp{x}",
                image=self.img,
                wfo=self.wfo,
                starttime=self.now + timedelta(2),
                endtime=self.now + timedelta(4),
            )
        actual = WeatherStory.objects.current(self.wfo)
        self.assertEqual(set(actual), expected)
        self.assertEqual(actual.first(), first)

    def test_weather_story_prune(self):
        """Test that prune prunes the oldest for that wfo and not more than the max."""
        # current weather stories
        for x in range(15):
            WeatherStory.objects.create(
                starttime=self.now - timedelta(2),
                endtime=self.now + timedelta(2),
                title=f"TestCur{x}",
                image=self.img,
                wfo=self.wfo,
            )
        # expired weather stories
        for x in range(2):
            WeatherStory.objects.create(
                title=f"TestExp{x}",
                image=self.img,
                wfo=self.wfo,
                starttime=self.now - timedelta(4),
                endtime=self.now - timedelta(2),
            )
        # other wfo's stories
        for x in range(5):
            WeatherStory.objects.create(
                title=f"Test{x}",
                image=self.img,
                wfo=self.other_wfo,
                starttime=self.now - timedelta(2),
                endtime=self.now + timedelta(2),
            )
        WeatherStory.objects.prune(self.wfo)
        actual = WeatherStory.objects.count()
        expected = 20
        self.assertEqual(actual, expected)
        self.assertFalse(WeatherStory.objects.filter(title="TestExp0").exists())
        self.assertFalse(WeatherStory.objects.filter(title="TestExp1").exists())

    @mock.patch("backend.util.mark_safer")
    def test_weather_story_description_as_html(self, mock_mark_safer):
        """Tests getting weather story description as safe HTML."""
        story = WeatherStory.objects.create(
            title="Test",
            description="Description body goes here",
            starttime=datetime.now(tz=timezone.utc),
            endtime=datetime.now(tz=timezone.utc),
            wfo=self.wfo,
        )
        _html = story.html

        mock_mark_safer.assert_called_with("Description body goes here", tags={"strong", "em", "ol", "li", "ul"})
