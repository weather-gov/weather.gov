from django.test import TestCase
from backend.models import Region, WFO

class WFOModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        region = Region(name="FAKE REGION")
        wfo = WFO(name="FAKE WFO", code="FFF", region=region)
        region.save()
        wfo.save()

    def test_wfo_default_weight(self):
        """Ensure we have the default value for the weight"""
        wfo = WFO.objects.get(id=1)
        expected = 0
        actual = wfo.weight

        self.assertEqual(expected, actual)
