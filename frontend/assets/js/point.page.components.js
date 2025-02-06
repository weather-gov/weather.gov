/**
 * This module bundles all components that are
 * custom elements.
 * The libraries.yml file will then ensure they are not
 * deferred, and are loaded into the head tag so that
 * processing of the custom elements happens earlier in
 * the page load.
 * This should help with the browser test flakiness
 * when combined with a good `waitUntil` value on
 * page loads
 */
import("./components/TabbedNavigator.js");
import("./components/HourlyTable.js");
import("./components/Tabs.js");
import("./components/DailyForecast.js");
import("./components/combo-box.js");
import("./components/combo-box-location.js");
