/**
 * @file JavaScript used on most pages.
 * Used by: page.html
 */

// Utilities
import "./components/timer.js";

// For site nav
import "./components/site-nav.js";

// For location search
import "./components/wx-loader.js";
import "./locationSearch.js";
import "./components/combobox/combobox.js";
import "./components/combobox/location-listbox.js";
// TODO: remove these once the search menu is using the new component
import "./components/combo-box.js";
import "./components/combo-box-location.js";

// RUM
import "./aws-rum.js";

// For connectivity detection
import "./components/offline-banner.js";

// For people who use screen readers
import "./components/aria-live.js";
