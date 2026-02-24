from django.test import TestCase, override_settings
from django.urls import reverse


@override_settings(DEBUG_SHOW_ALL_MENU_LINKS=True)
class SiteNavigationAllMenuTests(TestCase):
    """Ensure that we can use the site navigation menu in debug mode."""

    def test_menus(self):
        """Verify that all menu items are present."""
        response = self.client.get(reverse("index"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed("weather/partials/site-navigation.html")
        self.assertContains(response, 'id="nav-section-forecast"')
        self.assertContains(response, 'id="nav-section-preparedness"')
        self.assertContains(response, 'id="nav-section-resources"')
        self.assertContains(response, 'id="nav-section-about"')

    def test_submenus(self):
        """Verify that all submenu items are present."""
        response = self.client.get(reverse("index"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed("weather/partials/site-navigation.html")
        self.assertContains(response, "usa-nav__submenu-item", count=13)


@override_settings(DEBUG_SHOW_ALL_MENU_LINKS=False)
class SiteNavigationPartialMenuTests(TestCase):
    """Ensure that we can use the site navigation menu in production."""

    def test_menus(self):
        """Verify that only menu items with links are present."""
        response = self.client.get(reverse("index"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed("weather/partials/site-navigation.html")
        self.assertContains(response, 'id="nav-section-forecast"')
        self.assertNotContains(response, 'id="nav-section-preparedness"')
        self.assertNotContains(response, 'id="nav-section-resources"')
        self.assertContains(response, 'id="nav-section-about"')
