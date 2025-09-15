from django.test import TestCase

from backend.models import WFO, Region


class RegionModelTests(TestCase):
    """Test Django's ability to use foreign keys."""

    @classmethod
    def setUpTestData(cls):
        """Create and save Region and WFO records."""
        region = Region(name="FAKE REGION")
        region.save()
        for i in range(3):
            name = f"FAKE WFO {i}"
            code = f"FF{i}"
            wfo = WFO(name=name, code=code, region=region)
            wfo.save()

    def test_region_name(self):
        """Ensure that we have the correct supplied name."""
        expected = "FAKE REGION"
        region = Region.objects.all()[0]

        self.assertEqual(expected, region.name)

    def test_all_valid_in_region(self):
        """Ensure that all the correct WFOs are in the region."""
        region = Region.objects.all()[0]
        wfos = region.wfo_set.all()
        for wfo in wfos:
            self.assertEqual(region, wfo.region)

    def test_wfo_not_in_region(self):
        """Ensure that a WFO is correctly _not_ related to the linked region."""
        ephemeral_region = Region(name="ephemeral")
        ephemeral_wfo = WFO(name="ephemeral wfo", code="EPH", region=ephemeral_region)
        region = Region.objects.all()[0]

        self.assertNotEqual(region, ephemeral_wfo.region)
