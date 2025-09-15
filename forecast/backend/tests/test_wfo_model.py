from django.test import TestCase

from backend.models import WFO, Region


class WFOModelTests(TestCase):
    """Test Django's ability to save WFO and Region mdoels."""

    @classmethod
    def setUpTestData(cls):
        """Create and save Region and WFO records."""
        region = Region(name="FAKE REGION")
        wfo = WFO(name="FAKE WFO", code="FFF", region=region)
        region.save()
        wfo.save()

    def test_wfo_default_weight(self):
        """Ensure we have the default value for the weight."""
        wfo = WFO.objects.all()[0]
        expected = 0
        actual = wfo.weight

        self.assertEqual(expected, actual)

    def test_wfo_name(self):
        """Ensure we have the correct name given."""
        wfo = WFO.objects.all()[0]

        self.assertEqual("FAKE WFO", wfo.name)

    def test_wfo_code(self):
        """Ensure we have the correct code given."""
        wfo = WFO.objects.all()[0]

        self.assertEqual("FFF", wfo.code)

    def test_wfo_region(self):
        """Ensure that we have the expected region parent/relation."""
        wfo = WFO.objects.all()[0]
        region = wfo.region

        self.assertEqual("FAKE REGION", region.name)
