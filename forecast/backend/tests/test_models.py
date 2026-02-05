from django.test import TestCase

from backend.models import WFO, DynamicSafetyInformation, Region


class TestModels(TestCase):
    """Test Django models."""

    @classmethod
    def setUpTestData(cls):
        """Create and save Region and WFO records."""
        cls.region = Region(name="FAKE REGION")
        cls.region.save()

        cls.wfo = WFO.objects.create(name="Test Office", code="TST", region=cls.region)

    def test_dynamic_safety_info_string(self):
        """Tests the stringification of Dynamic Safety Information."""
        self.assertEqual(
            str(
                DynamicSafetyInformation(
                    type="Big Baddaboom",
                    label="big ol' thunderstorm",
                    body="It's raining!",
                ),
            ),
            "Big Baddaboom",
        )

    def test_wfo_string(self):
        """Tests the stringification of WFOs."""
        self.assertEqual(
            str(WFO(name="Robble robble", code="RBR", region=self.region)),
            "Robble robble (RBR)",
        )

    def test_wfo_class_normalization(self):
        """Tests that WFO codes for Alaska are normalized (class method)."""
        self.assertEqual(WFO.normalize_code("alu"), "AFC")
        self.assertEqual(WFO.normalize_code("aer"), "AFC")
        self.assertEqual(WFO.normalize_code("abc"), "ABC")

    def test_wfo_normalization(self):
        """Tests that WFO codes for Alaska are normalized."""
        self.assertEqual(WFO(name="One of the Alaska ones", code="alu", region=self.region).normalized_code, "AFC")
        self.assertEqual(WFO(name="The other Alaska one", code="aer", region=self.region).normalized_code, "AFC")
        self.assertEqual(WFO(name="Some other WFO", code="abc", region=self.region).normalized_code, "ABC")

    def test_region_string(self):
        """Tests the stringification of Regions."""
        self.assertEqual(
            str(Region(name="Some Mountains")),
            "Some Mountains",
        )

    def test_has_social_is_false(self):
        """Tests that has_social is false if none of the social fields are set."""
        self.assertEqual(self.wfo.has_social, False)

    def test_has_social_is_true_if_facebook(self):
        """Tests that has_social is true if Facebook is set."""
        self.wfo.facebook = "https://hello"
        self.wfo.twitter = None
        self.wfo.youtube = None
        self.assertEqual(self.wfo.has_social, True)

    def test_has_social_is_true_if_twitter(self):
        """Tests that has_social is true if Twitter is set."""
        self.wfo.facebook = None
        self.wfo.twitter = "https://tweetweet"
        self.wfo.youtube = None
        self.assertEqual(self.wfo.has_social, True)

    def test_has_social_is_true_if_youtube(self):
        """Tests that has_social is true if YouTube is set."""
        self.wfo.facebook = None
        self.wfo.twitter = None
        self.wfo.youtube = "https://tv.com"
        self.assertEqual(self.wfo.has_social, True)

    def test_has_first_pane_is_false(self):
        """Tests that has_first_pane is false if none of the fields are set."""
        self.assertEqual(self.wfo.has_first_pane, False)

    def test_has_first_pane_is_true_if_phone(self):
        """Tests that has_social is true if phone is set."""
        self.wfo.phone = "ring ring"
        self.wfo.address = None
        self.wfo.email = None
        self.assertEqual(self.wfo.has_first_pane, True)

    def test_has_first_pane_is_true_if_address(self):
        """Tests that has_social is true if address is set."""
        self.wfo.phone = None
        self.wfo.address = "Pennsylvania 6-5000"
        self.wfo.email = None
        self.assertEqual(self.wfo.has_first_pane, True)

    def test_has_first_pane_is_true_if_email(self):
        """Tests that has_social is true if email is set."""
        self.wfo.phone = None
        self.wfo.address = None
        self.wfo.email = "testbot@weather.gov"
        self.assertEqual(self.wfo.has_first_pane, True)

    def test_has_contact_false(self):
        """Test has_contact is false if none of the fields are set."""
        self.wfo.facebook = None
        self.wfo.twitter = None
        self.wfo.youtube = None
        self.wfo.address = None
        self.wfo.email = None
        self.assertEqual(self.wfo.has_contact, False)

    def test_has_contact_is_true_if_social(self):
        """Test has_contact is true if a social field is set."""
        self.wfo.facebook = "https://nose"
        self.wfo.twitter = None
        self.wfo.youtube = None
        self.wfo.address = None
        self.wfo.email = None
        self.assertEqual(self.wfo.has_contact, True)

    def test_has_contact_is_true_if_address(self):
        """Test has_contact is true if address is set."""
        self.wfo.facebook = None
        self.wfo.twitter = None
        self.wfo.youtube = None
        self.wfo.address = "Silver Spring, MD"
        self.wfo.email = None
        self.assertEqual(self.wfo.has_contact, True)

    def test_has_contact_true_if_email(self):
        """Test has_contact is false if email is set."""
        self.wfo.facebook = None
        self.wfo.twitter = None
        self.wfo.youtube = None
        self.wfo.address = None
        self.wfo.email = "rain@sky"
        self.assertEqual(self.wfo.has_contact, True)
