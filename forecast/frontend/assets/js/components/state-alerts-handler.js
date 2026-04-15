/**
 * Component to handle merging and filtering state alerts by event type.
 * This class processes raw alert data from the backend, groups it by event name,
 * and renders it into the DOM using HTML templates to maintain a clean separation
 * between logic and presentation.
 */
export default class StateAlertsHandler {
  constructor() {
    // Retrieve the data bridges provided by the Django template
    const dataElem = document.getElementById("alerts-data");
    const metaElem = document.getElementById("state-metadata");

    // Guard clause: if data is missing, don't initialize
    if (!dataElem || !metaElem) return;

    // Parse the JSON data provided by the backend
    this.rawAlerts = JSON.parse(dataElem.textContent);
    this.meta = JSON.parse(metaElem.textContent);

    // Cache DOM references for performance
    this.stateAlertContainer = document.getElementById(
      "state-alerts-container",
    );
    this.template = document.getElementById("state-alert-template");
    this.allTabs = document.querySelectorAll("button[data-alert-day]");

    this.init();
  }

  /**
   * Initializes the component by rendering the default view ("all")
   * and setting up event listeners for the day-filtering tabs.
   */
  init() {
    // Initial render: show all active alerts
    this.render("all");

    // Set up click listeners for the segmented tab control
    this.allTabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const day = e.currentTarget.getAttribute("data-alert-day");
        this.syncTabs(day); // Visual update for the buttons
        this.render(day); // Logic update for the content
      });
    });
  }

  /**
   * Updates the ARIA state of the tab buttons to reflect the current selection.
   * @param {string} selectedDay - The numeric day index or "all".
   */
  syncTabs(selectedDay) {
    this.allTabs.forEach((btn) => {
      const isMatch = btn.getAttribute("data-alert-day") === selectedDay;
      btn.setAttribute("aria-selected", isMatch ? "true" : "false");
    });
  }

  /**
   * Filters and groups alerts, then draws them into the container.
   * @param {string} selectedDay - The numeric day index or "all".
   */
  render(selectedDay) {
    /**
     * Filter and Group
     * Multiple backend alerts might share the same "event" ("Flood Warning").
     * We merge them so we can show one "Flood Warning" block with a combined list of counties.
     */
    const grouped = this.rawAlerts.reduce((acc, alert) => {
      // Check if the alert is active for the day the user selected
      const isDayMatch =
        selectedDay === "all" ||
        alert.alertDays.some((d) => String(d) === String(selectedDay));

      if (isDayMatch) {
        const eventName = alert.event;
        // Initialize the group if it doesn't exist
        if (!acc[eventName]) {
          acc[eventName] = {
            name: eventName,
            level: alert.metadata.level.text,
            counties: new Map(), // Use a Map to ensure unique FIPS entries
          };
        }
        // Merge counties into the unique Map
        Object.entries(alert.counties_dict).forEach(([fips, name]) => {
          acc[eventName].counties.set(fips, name);
        });
      }
      return acc;
    }, {});

    // Clear existing content before re-rendering
    this.stateAlertContainer.innerHTML = "";
    const groups = Object.values(grouped);

    // Handle "No Alerts" state
    if (groups.length === 0) {
      this.stateAlertContainer.innerHTML = `<div class="no-alerts-msg margin-top-2">${this.meta.trans.none}</div>`;
      return;
    }

    // Access the nested sub-template for individual county links
    const countyTemplate = this.template.content.getElementById(
      "county-link-template",
    );

    /**
     * Render Each Group
     */
    groups.forEach((group, index) => {
      // Clone the main alert box template
      const clone = this.template.content.cloneNode(true);
      const alertBox = clone.querySelector(".wx-state-alert");

      const iconUse = alertBox.querySelector(".js-alert-icon-use");
      const currentHref =
        iconUse.getAttribute("href") || iconUse.getAttribute("xlink:href");
      if (currentHref) {
        const basePath = currentHref.split("#")[0];
        iconUse.setAttribute("href", `${basePath}#warning`);
        iconUse.setAttribute("xlink:href", `${basePath}#warning`);
      }

      // Apply dynamic attributes and IDs for linking from the map
      const eventId = `id-${slugify(group.name)}`;
      alertBox.id = eventId;
      alertBox.setAttribute("data-alert-level", group.level.toLowerCase());

      // Set the title ("flood warning")
      alertBox.querySelector(".js-event-name").textContent =
        group.name.toLowerCase();

      // Convert Map back to an array and sort alphabetically by county name
      const entries = Array.from(group.counties.entries()).sort((a, b) => {
        return a[1].localeCompare(b[1], undefined, { sensitivity: "base" });
      });

      // Construct the "X of Y Counties" localized string
      const pattern = this.meta.trans.count_pattern;
      const displayStr = pattern
        .replace("{count}", entries.length)
        .replace("{total}", this.meta.totalCounties)
        .replace("{subdivision}", this.meta.trans.subdivision_name_plural);

      alertBox.querySelector(".js-count-display").textContent = displayStr;

      const list = alertBox.querySelector(".js-county-list");

      // Dynamic Grid Logic: adjust columns based on the density of the county list
      if (entries.length > 8) list.classList.add("county-columns");

      if (entries.length > 24)
        list.classList.add(
          "desktop__county-column-4",
          "tablet__county-column-3",
        );
      else if (entries.length > 16)
        list.classList.add("tablet__county-column-3");
      else if (entries.length > 8)
        list.classList.add("tablet__county-column-2");

      /**
       * Populate County Links
       * For every county in the group, we clone the sub-template and fill it.
       */
      entries.forEach(([fips, name]) => {
        const liClone = countyTemplate.content.cloneNode(true);
        const link = liClone.querySelector(".js-county-link");

        // Populate link data slots
        link.href = `/county/${fips}/`;
        liClone.querySelector(".js-county-name").textContent = name;
        liClone.querySelector(".js-subdivision-label").textContent =
          ` ${this.meta.trans.subdivision_name}`;
        liClone.querySelector(".js-state-code").textContent =
          this.meta.stateCode;

        // Append the item to the group's <ul>
        list.appendChild(liClone);
      });

      // Add the fully populated alert block to the page
      this.stateAlertContainer.appendChild(clone);
    });
  }
}

/**
 * Slugification helper.
 * Converts "Special Weather Statement" to "special-weather-statement".
 */
const slugify = (text) => text.toLowerCase().replace(/[\s\W|_]+/g, "-");

new StateAlertsHandler();
