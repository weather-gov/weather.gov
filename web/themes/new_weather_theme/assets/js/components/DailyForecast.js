/**
 * Daily Forecast Component
 * -------------------------
 * This component wraps the main elements of the
 * Daily Forecast tabpanel, specifically:
 * - the quick forecast nav / tab component
 * - the list containing daily forecasts
 * Its purpose is to manage setting the daily forecast into
 * "quick forecast tab mode" (on desktop) vs "quick toggle"
 * mode.
 * For a11y purposes, we need to add and remove aria attributes
 * and roles dynamically when breaking to and from desktop width.
 * This component also overrides click behavior on the quick
 * forecast nav links, forcing them to operate as tabs that
 * hide/show relevant forecast day list items.
 */
class DailyForecast extends HTMLElement {
  constructor(){
    super();

    // Bound methods
    this.tabClickHandler = this.tabClickHandler.bind(this);
    this.setupMediaEvents = this.setupMediaEvents.bind(this);
    this.setupTabMode = this.setupTabMode.bind(this);
    this.undoTabMode = this.undoTabMode.bind(this);
    this.handleDesktopMediaChange = this.handleDesktopMediaChange.bind(this);
    this.handleKeys = this.handleKeys.bind(this);
  }

  connectedCallback(){
    this.setupMediaEvents();

    this.addEventListener("keydown", this.handleKeys);
  }

  disconnectedCallback(){
    Array.from(
      this.querySelectorAll(".wx-quick-forecast-item")
    ).forEach(item => {
      item.removeEventListener("click", this.tabClickHandler);
    });

    this.removeEventListener("keydown", this.handleKeys);
  }

  /**
   * In order to respond to the change in desktop
   * breakpoint / media query, we need to pull out
   * preset CSS Custom Property values and then
   * set up matchMedia listeners.
   * This method does so, and also calls the handler
   * immediately, so as to setup the component for
   * the given media (desktop or everything else)
   */
  setupMediaEvents(){
    const computedStyle = getComputedStyle(this);
    this.desktopBreakpoint = computedStyle.getPropertyValue("--wx-media-breakpoint-desktop");
    this.desktopQuery = window.matchMedia(`(min-width: ${this.desktopBreakpoint})`);
    this.desktopQuery.addEventListener("change", this.handleDesktopMediaChange);
    this.handleDesktopMediaChange();
  }

  /**
   * "tab mode" corresponds to the desktop width
   * view, where the quick forecast nav component
   * is displayed and acts as a tablist, also transforming
   * each daily forecast list item into a corresponding
   * tabpanel.
   * This is primarily accomplished by setting role and
   * aria attributes as needed on the appropriate elements.
   */
  setupTabMode(){
    // Set up the tabpanel role for the forecast items
    const panelRefs = [];
    this.forecastList = this.querySelector(".wx-forecast-list");
    Array.from(this.forecastList.querySelectorAll(".wx-daily-forecast-list-item-inner"))
      .forEach(item => {
        item.setAttribute("role", "tabpanel");
        panelRefs.push(item.id);
      });
    
    // Set up the tablist and tab roles for the
    // quick forecast and its nav items
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

    // Bind even handlers for click on tabs
    Array.from(
      this.querySelectorAll(".wx-quick-forecast-item")
    ).forEach(item => {
      item.addEventListener("click", this.tabClickHandler);
    });

    // Click the first item in the list to select it
    this.querySelector(".wx-quick-forecast-item:first-child").click();
  }

  /**
   * "non-tab mode" corresponds to anything below desktop
   * width, where the quick forecast is hidden.
   * The daily forecast items will be displayed as accordion toggled
   * content, all of which is handled by CSS.
   * We need to remove the role and aria attributes added by
   * tab mode, in order to keep a11y properties correct
   * (for example, daily list items shouldn't have tabpanel roles anymore).
   * This method cleans up those attributes as needed.
   */
  undoTabMode(){
    // Remove all tabpanel roles/aria
    Array.from(
      this.querySelectorAll(".wx-daily-forecast-list-item, .wx-daily-forecast-list-item-inner")
    ).forEach(item => {
      item.removeAttribute("role");
      item.removeAttribute("aria-labelledby");
    });

    // Remove all tab roles/aria
    Array.from(
      this.querySelectorAll(".wx-quick-forecast-item")
    ).forEach(item => {
      item.removeAttribute("role");
      item.removeAttribute("aria-controls");
    });
  }

  /**
   * When the media query for USWDS "desktop" has changed,
   * this handler will be called.
   * It will toggle tab/non-tab mode as needed.
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
   * Click handler for quick-forecast nav link elements.
   * Overrides the normal (in page linking) behavior, and
   * operates as a tab, toggling attributes as needed to
   * show/hide appropriate tabpanels
   */
  tabClickHandler(event){
    event.preventDefault();
    if(event.target.getAttribute("aria-selected") !== "true"){
      Array.from(this.querySelectorAll(".wx-quick-forecast-item"))
        .forEach(item => item.setAttribute("aria-selected", "false"));
      event.target.setAttribute("aria-selected", "true");

      // Update panel data attributes, used for showing/hiding
      // the tabs
      Array.from(
        this.forecastList.querySelectorAll(".wx-daily-forecast-list-item-inner")
      ).forEach(item => item.setAttribute("data-tabpanel-active", "false"));
      const correspondingPanelId = event.target.getAttribute("aria-controls");
      const correspondingPanel = document.getElementById(correspondingPanelId);
      correspondingPanel.setAttribute("data-tabpanel-active", "true");
    }
  }

  /**
   * Handle the additional key events required by the
   * WCAG tabs pattern
   */
  handleKeys(event){
    if(event.code === "Space"){
      // Space selects the item
      event.target.click();
      event.preventDefault();
    } else if(event.code === "ArrowRight"){
      // Move to the next element in the nav list.
      // If we are already on the last one, loop back to
      // the first one.
      if(event.target.matches(":last-child")){
        this.querySelector(".wx-quick-forecast-item:first-child").focus();
      } else {
        event.target.nextElementSibling.focus();
      }
    } else if(event.code === "ArrowLeft"){
      // Move to the previous element in the nav list.
      // If we are already on the first element, loop
      // around to the last one.
      if(event.target.matches(":first-child")){
        this.querySelector(".wx-quick-forecast-item:last-child").focus();
      } else {
        event.target.previousElementSibling.focus();
      }
    } else if(event.code === "Home"){
      // Move focus to the first nav item
      this.querySelector(".wx-quick-forecast-item:first-child").focus();
      event.preventDefault();
    } else if(event.code === "End"){
      // Move focus to the last nav item
      this.querySelector(".wx-quick-forecast-item:last-child").focus();
      event.preventDefault();
    }
  }
}

window.customElements.define("wx-daily-forecast", DailyForecast);
