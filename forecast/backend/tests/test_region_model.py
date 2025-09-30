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

    def test_all_valid_in_region(self):
        """Ensure that all the fake WFOs are in the fake region."""
        region = Region.objects.get(name="FAKE REGION")
        wfos = region.wfos.filter(name__contains="FAKE WFO")
        for wfo in wfos:
            self.assertEqual(region, wfo.region)

    def test_wfo_not_in_region(self):
        """Ensure that a WFO is correctly _not_ related to the linked region."""
        ephemeral_region = Region(name="ephemeral")
        ephemeral_wfo = WFO(name="ephemeral wfo", code="EPH", region=ephemeral_region)
        region = Region.objects.first()

        self.assertNotEqual(region, ephemeral_wfo.region)
