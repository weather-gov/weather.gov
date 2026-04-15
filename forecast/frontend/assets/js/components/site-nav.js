/**
 * Site navigation interaction
 */

// Import the tabbed-nav component, which is used by
// the search box popout
import "./TabbedNavigator.js";

const setupSiteSearchMenuButton = (siteSubmenuElement) => {
  const button = siteSubmenuElement.querySelector(`button[aria-expanded]`);

  button.addEventListener("click", () => {
    if (button.getAttribute("aria-expanded") === "false") {
      button.setAttribute("aria-expanded", "true");
    } else {
      button.setAttribute("aria-expanded", "false");
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  // Find the site search submenu and add a click listener
  // to toggle the aria-expanded attribute.
  const siteSearchSubmenu = document.getElementById("site-search-submenu");
  if (siteSearchSubmenu) {
    setupSiteSearchMenuButton(siteSearchSubmenu);
  }
});
