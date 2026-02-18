/**
 * Daily Forecast Component
 * -------------------------
 * Wraps the daily forecast panel and the quick-forecast nav
 * strip. At desktop widths the nav items become WCAG tabs that
 * show/hide individual day panels; below desktop the component
 * reverts to the default accordion-style layout managed by CSS.
 *
 * Keyboard navigation for the tab-mode view is handled by the
 * shared tab-keyboard-nav utility, keeping the arrow-key /
 * Home / End / Space logic in one place across all tab-like
 * components on the site.
 */
import { attachTabKeyboardNav } from "./tab-keyboard-nav.js";

class DailyForecast extends HTMLElement {
  constructor(){
    super();

    // Bound callbacks for click and media-change events
    this.tabClickHandler = this.tabClickHandler.bind(this);
    this.setupMediaEvents = this.setupMediaEvents.bind(this);
    this.setupTabMode = this.setupTabMode.bind(this);
    this.undoTabMode = this.undoTabMode.bind(this);
    this.handleDesktopMediaChange = this.handleDesktopMediaChange.bind(this);
  }

  connectedCallback(){
    this.setupMediaEvents();

    // Attach keyboard navigation for the quick-forecast items.
    // Space should activate the focused item (matching the
    // original behavior that used event.code). Returns a
    // teardown function for cleanup on disconnect.
    this._cleanupKeyNav = attachTabKeyboardNav(
      this,
      ".wx-quick-forecast-item",
      { activateOnSpace: true },
    );
  }

  disconnectedCallback(){
    // Clean up click handlers on the quick-forecast nav items
    Array.from(
      this.querySelectorAll(".wx-quick-forecast-item")
    ).forEach(item => {
      item.removeEventListener("click", this.tabClickHandler);
    });

    // Tear down keyboard navigation
    if(this._cleanupKeyNav){
      this._cleanupKeyNav();
    }
  }

  /**
   * Reads the desktop breakpoint from a CSS custom property
   * and sets up a matchMedia listener so we can toggle between
   * tab mode (desktop) and accordion mode (narrower viewports).
   * Fires the handler once immediately to pick up the current
   * screen size.
   */
  setupMediaEvents(){
    const computedStyle = getComputedStyle(this);
    this.desktopBreakpoint = computedStyle.getPropertyValue("--wx-media-breakpoint-desktop");
    this.desktopQuery = window.matchMedia(`(min-width: ${this.desktopBreakpoint})`);
    this.desktopQuery.addEventListener("change", this.handleDesktopMediaChange);
    this.handleDesktopMediaChange();
  }

  /**
   * Activates tab mode for the desktop layout. Assigns ARIA
   * roles and references so the quick-forecast strip operates
   * as a proper tablist, with each day's forecast acting as
   * the corresponding tabpanel.
   */
  setupTabMode(){
    // Tag each forecast day wrapper with the tabpanel role
    // and collect their ids for aria-controls references
    const panelRefs = [];
    this.forecastList = this.querySelector(".wx-forecast-list");
    Array.from(this.forecastList.querySelectorAll(".wx-daily-forecast-list-item-inner"))
      .forEach(item => {
        item.setAttribute("role", "tabpanel");
        panelRefs.push(item.id);
      });

    // Promote the quick-forecast strip to a tablist and
    // mark each nav item as a tab with the right controls ref
    this.quickForecastEl = this.querySelector(".wx-quick-forecast");
    this.quickForecastEl.setAttribute("role", "tablist");
    Array.from(
      this.quickForecastEl.querySelectorAll(".wx-quick-forecast-item")
    ).forEach((item, idx) => {
      item.setAttribute("role", "tab");
      item.setAttribute("aria-controls", panelRefs[idx]);
      const correspondingPanel = document.getElementById(panelRefs[idx]);
      correspondingPanel.setAttribute("aria-labelledby", item.id);
    });

    // Bind click handlers so tapping a nav item reveals its panel
    Array.from(
      this.querySelectorAll(".wx-quick-forecast-item")
    ).forEach(item => {
      item.addEventListener("click", this.tabClickHandler);
    });

    // Select the first day by default
    this.querySelector(".wx-quick-forecast-item:first-child").click();
  }

  /**
   * Tears down tab mode when the viewport drops below the
   * desktop breakpoint. Removes all the ARIA roles and
   * references that only make sense in tab context, so the
   * accordion fallback is semantically clean.
   */
  undoTabMode(){
    // Strip tabpanel roles and labelledby from forecast items
    Array.from(
      this.querySelectorAll(".wx-daily-forecast-list-item, .wx-daily-forecast-list-item-inner")
    ).forEach(item => {
      item.removeAttribute("role");
      item.removeAttribute("aria-labelledby");
    });

    // Strip tab roles and controls from nav items
    Array.from(
      this.querySelectorAll(".wx-quick-forecast-item")
    ).forEach(item => {
      item.removeAttribute("role");
      item.removeAttribute("aria-controls");
    });
  }

  /**
   * Called whenever the desktop media query changes state.
   * Switches between tab mode and non-tab mode and stamps
   * an attribute on the component for CSS hooks.
   */
  handleDesktopMediaChange(){
    this.setAttribute("wx-media-desktop", this.desktopQuery.matches);
    if(this.desktopQuery.matches){
      this.setupTabMode();
    } else {
      this.undoTabMode();
    }
  }

  /**
   * Click handler for the quick-forecast nav items in tab mode.
   * Overrides the default anchor behavior and toggles
   * aria-selected / data-tabpanel-active attributes to reveal
   * the corresponding day panel.
   */
  tabClickHandler(event){
    event.preventDefault();
    if(event.target.getAttribute("aria-selected") !== "true"){
      // Clear selection on every nav item first
      Array.from(this.querySelectorAll(".wx-quick-forecast-item"))
        .forEach(item => item.setAttribute("aria-selected", "false"));
      event.target.setAttribute("aria-selected", "true");

      // Toggle the active panel attribute used by CSS to
      // control which forecast day is visible
      Array.from(
        this.forecastList.querySelectorAll(".wx-daily-forecast-list-item-inner")
      ).forEach(item => item.setAttribute("data-tabpanel-active", "false"));
      const correspondingPanelId = event.target.getAttribute("aria-controls");
      const correspondingPanel = document.getElementById(correspondingPanelId);
      correspondingPanel.setAttribute("data-tabpanel-active", "true");
    }
  }
}

window.customElements.define("wx-daily-forecast", DailyForecast);
