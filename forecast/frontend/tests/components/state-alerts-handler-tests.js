import { expect } from "chai";
import StateAlertsHandler from "../../assets/js/components/state-alerts-handler.js";

describe("StateAlertsHandler", () => {
  let handler;

  beforeEach(() => {
    document.body.innerHTML = `
      <script id="alerts-data" type="application/json">
        [
          {
            "event": "Flood Warning",
            "alertDays": [0, 1],
            "metadata": { "level": { "text": "Warning" } },
            "counties_dict": { "01001": "Autauga", "01003": "Baldwin" }
          },
          {
            "event": "Severe Thunderstorm Watch",
            "alertDays": [1],
            "metadata": { "level": { "text": "Watch" } },
            "counties_dict": { "01001": "Autauga" }
          }
        ]
      </script>
      <script id="state-metadata" type="application/json">
        {
          "totalCounties": 67,
          "stateCode": "AL",
          "trans": {
            "none": "No active alerts",
            "count_pattern": "{count} of {total} {subdivision}",
            "subdivision_name": "County",
            "subdivision_name_plural": "Counties"
          }
        }
      </script>

      <button data-alert-day="all" aria-selected="true">All</button>
      <button data-alert-day="0" aria-selected="false">Day 0</button>
      <button data-alert-day="1" aria-selected="false">Day 1</button>

      <div id="state-alerts-container"></div>

      <template id="state-alert-template">
        <div class="wx-state-alert">
          <svg><use xlink:href="sprite.svg#warning" class="js-alert-icon-use"></use></svg>
          <span class="js-event-name"></span>
          <div class="js-count-display"></div>
          <ul class="js-county-list"></ul>
        </div>
        <template id="county-link-template">
          <li>
            <a class="js-county-link">
              <span class="js-county-name"></span>
              <span class="js-subdivision-label"></span>
              <span class="js-state-code"></span>
            </a>
          </li>
        </template>
      </template>
    `;

    handler = new StateAlertsHandler();
  });

  describe("Initialization and Rendering", () => {
    it("renders all alerts by default", () => {
      const container = document.getElementById("state-alerts-container");
      const alertBoxes = container.querySelectorAll(".wx-state-alert");
      
      expect(alertBoxes.length).to.equal(2);
      expect(container.textContent).to.contain("flood warning");
      expect(container.textContent).to.contain("severe thunderstorm watch");
    });

    it("correctly merges and sorts counties within an alert block", () => {
      const floodWarningBox = document.querySelector("#id-flood-warning");
      const countyLinks = floodWarningBox.querySelectorAll(".js-county-name");
      
      expect(countyLinks.length).to.equal(2);
      expect(countyLinks[0].textContent).to.equal("Autauga");
      expect(countyLinks[1].textContent).to.equal("Baldwin");
    });

    it("applies the warning icon for both warnings and watches", () => {
      const warningBox = document.querySelector("#id-flood-warning");
      const warningIcon = warningBox.querySelector(".js-alert-icon-use");
      expect(warningIcon.getAttribute("xlink:href")).to.contain("#warning");

      const watchBox = document.querySelector("#id-severe-thunderstorm-watch");
      const watchIcon = watchBox.querySelector(".js-alert-icon-use");
      expect(watchIcon.getAttribute("xlink:href")).to.contain("#warning");
    });

    it("sets the correct data-alert-level attribute for CSS styling", () => {
      const watchBox = document.querySelector("#id-severe-thunderstorm-watch");
      const warningBox = document.querySelector("#id-flood-warning");

      expect(watchBox.getAttribute("data-alert-level")).to.equal("watch");
      expect(warningBox.getAttribute("data-alert-level")).to.equal("warning");
    });
  });

  describe("Filtering Logic", () => {
    it("filters alerts when a specific day tab is clicked", () => {
      const day0Btn = document.querySelector('button[data-alert-day="0"]');
      day0Btn.click();

      const container = document.getElementById("state-alerts-container");
      const alertBoxes = container.querySelectorAll(".wx-state-alert");

      expect(alertBoxes.length).to.equal(1);
      expect(container.textContent).to.contain("flood warning");
      expect(container.textContent).to.not.contain("severe thunderstorm watch");
    });

    it("shows the 'No Alerts' message if a day has no data", () => {
      // Manually trigger a render for a day we know isn't in rawAlerts
      handler.render("99");

      const container = document.getElementById("state-alerts-container");
      expect(container.textContent).to.equal("No active alerts");
    });
  });

  describe("Tab Syncing", () => {
    it("updates aria-selected attributes when a tab is clicked", () => {
      const day1Btn = document.querySelector('button[data-alert-day="1"]');
      const allBtn = document.querySelector('button[data-alert-day="all"]');

      day1Btn.click();

      expect(day1Btn.getAttribute("aria-selected")).to.equal("true");
      expect(allBtn.getAttribute("aria-selected")).to.equal("false");
    });
  });

  describe("String Formatting", () => {
    it("correctly formats the county count display string", () => {
      const floodWarningBox = document.querySelector("#id-flood-warning");
      const countDisplay = floodWarningBox.querySelector(".js-count-display");

      expect(countDisplay.textContent).to.equal("2 of 67 Counties");
    });
  });
});