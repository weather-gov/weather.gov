from django.core.exceptions import ValidationError
from django.test import TestCase

from backend.models import RoadmapEntry, RoadmapPage
from backend.util import disable_logging_for_quieter_tests


class TestRoadmapModels(TestCase):
    """Test roadmap-related models."""

    @disable_logging_for_quieter_tests
    def test_roadmap_entry_str(self):
        """Test that roadmap entries stringify to their names."""
        page = RoadmapPage.objects.create(
            title="Roadmap", body="Body", path="/", depth=0, meta_description="Description"
        )
        entry = RoadmapEntry.objects.create(
            name="Entry #1",
            description="",
            outcome="",
            period=RoadmapEntry.RoadmapTimePeriod.Now,
            page=page,
        )

        self.assertEqual("Entry #1", str(entry))

    @disable_logging_for_quieter_tests
    def test_roadmap_entry_mapping(self):
        """Test that roadmap entries map into the correct time periods in the page."""
        page = RoadmapPage.objects.create(
            title="Roadmap", body="Body", path="/", depth=0, meta_description="Description"
        )
        RoadmapEntry.objects.create(
            name="Entry #1",
            description="",
            outcome="",
            period=RoadmapEntry.RoadmapTimePeriod.Now,
            page=page,
        )
        RoadmapEntry.objects.create(
            name="Entry #2",
            description="",
            outcome="",
            period=RoadmapEntry.RoadmapTimePeriod.Later,
            page=page,
        )
        RoadmapEntry.objects.create(
            name="Entry #3",
            description="",
            outcome="",
            period=RoadmapEntry.RoadmapTimePeriod.Later,
            page=page,
        )
        RoadmapEntry.objects.create(
            name="Entry #4",
            description="",
            outcome="",
            period=RoadmapEntry.RoadmapTimePeriod.Now,
            page=page,
        )
        RoadmapEntry.objects.create(
            name="Entry #5",
            description="",
            outcome="",
            period=RoadmapEntry.RoadmapTimePeriod.Next,
            page=page,
        )

        context = page.get_context(None)

        now = [str(entry) for entry in context["entries"]["now"]]
        self.assertEqual(now, ["Entry #1", "Entry #4"])

        next = [str(entry) for entry in context["entries"]["next"]]
        self.assertEqual(next, ["Entry #5"])

        later = [str(entry) for entry in context["entries"]["later"]]
        self.assertEqual(later, ["Entry #2", "Entry #3"])

    @disable_logging_for_quieter_tests
    def test_roadmap_entry_validation(self):
        """Test that roadmap entries do not require a delivery date unless the delivered flag is set."""
        page = RoadmapPage.objects.create(
            title="Roadmap", body="Body", path="/", depth=0, meta_description="Description"
        )
        entry = RoadmapEntry.objects.create(
            name="Entry #1",
            description="",
            outcome="",
            period=RoadmapEntry.RoadmapTimePeriod.Now,
            page=page,
            delivery_date=None,
        )

        entry.clean()

        entry.delivered = True

        self.assertRaises(ValidationError, entry.clean)  # noqa: PT027

        entry.delivery_date = "2024-01-01"

        entry.clean()
