import { expect } from "chai";
import { before, beforeEach, afterEach } from "mocha";
import { createSandbox, stub } from "sinon";

/**
 * DailyForecast web component tests
 */
let sandbox;
before(async () => {
  // Import the module under tests, so that
  // the custom element registers properly
  await import("../../assets/js/components/DailyForecast.js");

  // Set up a global sandbox for sinon that we can then
  // tear down
  sandbox = createSandbox();

  // This component uses the window.matchMedia capability
  // so we need to stub it out
  window.matchMedia = stub();
  window.matchMedia.returns({
    matches: true,
    addEventListener: stub(),
    removeEventListener: stub(),
  });
});

describe("DailyForecast.js component tests", () => {
  describe("Loading and saving cached state", () => {
    const defaultMarkup = `<wx-daily-forecast cache="true">
    <div class="wx-quick-forecast" data-tablist-label="Daily forecast">
      <button type="button" class="wx-quick-forecast-item" id="day1-quick-forecast-button"><time id="day1-date">Today 11/02</time></button>
      <button type="button" class="wx-quick-forecast-item" id="day2-quick-forecast-button"><time id="day2-date">Tuesday 11/03</time></button>
      <button type="button" class="wx-quick-forecast-item" id="day3-quick-forecast-button"><time id="day3-date">Wednesday 11/04</time></button>
    </div>
    <ol class="wx-forecast-list">
        <li class="wx-daily-forecast-list-item">
            <div class="wx-daily-forecast-list-item-inner" id="day1-inner">
                <h3 class="wx-daily-forecast-quick-toggle" aria-expanded="false">
                    <button class="wx-quick-toggle-item" id="day1-quick-toggle-button" aria-controls="daily-content-day1">
                    </button>
                </h3>
                <div  class="wx-daily-forecast-item-content" id="daily-content-day1">
                    <wx-tabs>
                        <button id="hourly-table-tab_day1" aria-selected="true" aria-controls="table_day1__" role="tab"></button>
                        <button id="hourly-charts-tab_day1" aria-selected="false" aria-controls="charts_day1__" role="tab"></button>
                    </wx-tabs>
                </div>
            </div>
        </li>
        <li class="wx-daily-forecast-list-item">
            <div class="wx-daily-forecast-list-item-inner" id="day2-inner">
                <h3 class="wx-daily-forecast-quick-toggle" aria-expanded="false">
                    <button class="wx-quick-toggle-item" id="day2-quick-toggle-button" aria-controls="daily-content-day2">
                    </button>
                </h3>
                <div  class="wx-daily-forecast-item-content" id="daily-content-day2">
                    <wx-tabs class="wx-forecast-details-toggle">
                        <button id="hourly-table-tab_day2" aria-selected="true" aria-controls="table_day2__" role="tab"></button>
                        <button id="hourly-charts-tab_day2" aria-selected="false" aria-controls="charts_day2__" role="tab"></button>
                    </wx-tabs>
                </div>
            </div>
        </li>
        <li class="wx-daily-forecast-list-item">
            <div class="wx-daily-forecast-list-item-inner" id="day3-inner">
                <h3 class="wx-daily-forecast-quick-toggle" aria-expanded="false">
                    <button class="wx-quick-toggle-item" id="day3-quick-toggle-button" aria-controls="daily-content-day3">
                    </button>
                </h3>
                <div  class="wx-daily-forecast-item-content" id="daily-content-day3">
                    <wx-tabs>
                        <button id="hourly-table-tab_day3" aria-selected="true" aria-controls="table_day3__" role="tab"></button>
                        <button id="hourly-charts-tab_day3" aria-selected="false" aria-controls="charts_day3__" role="tab"></button>
                    </wx-tabs>
                </div>
            </div>
        </li>
    </ol>
</wx-daily-forecast> 
`;
    let component;
    describe("the cache attribute", () => {
      beforeEach(() => {
        document.body.innerHTML = defaultMarkup;
        component = document.querySelector("wx-daily-forecast");
        sandbox.spy(component, "getCachedState");
      });

      it("does not call #getCachedState when the cache attribute is missing", () => {
        component.removeAttribute("cache");
        component.loadCachedState();

        expect(component.getCachedState.callCount).to.equal(0);
      });

      it("does call #getCachedState when the cache attribute is present and true", () => {
        component.setAttribute("cache", "true");
        component.loadCachedState();

        expect(component.getCachedState.callCount).to.equal(1);
      });
    });

    beforeEach(() => {
      document.body.innerHTML = defaultMarkup;
      component = document.querySelector("wx-daily-forecast");
      sandbox.stub(component, "getCachedState");
    });

    it("will activate the first quick forecast item if there is no preserved state", () => {
      component.getCachedState.returns({});
      const firstItem = component.querySelector(
        ".wx-quick-forecast-item:first-child",
      );
      sandbox.spy(firstItem, "click");

      component.loadCachedState();

      expect(firstItem.click.callCount).to.equal(0);
      expect(firstItem.getAttribute("aria-selected")).to.equal("true");
    });

    it("will activate a given quick forecast item if it is in the state", () => {
      const state = {
        quickForecastItem: {
          id: "day2-quick-forecast-button",
        },
      };
      const expectedItem = document.getElementById(
        "day2-quick-forecast-button",
      );
      component.getCachedState.returns(state);

      expect(expectedItem.getAttribute("aria-selected")).to.equal("false");

      component.loadCachedState();

      expect(expectedItem.getAttribute("aria-selected")).to.equal("true");
    });

    it("will click the appropriate charts/table toggle if the state is set", () => {
      const state = { chartToggle: "hourly-charts-tab_day2" };
      const tabElement = document.getElementById("hourly-charts-tab_day2");

      // Note that this component does not handle state changes on
      // the tabs themselves, which is handled by the generic Tabs component.
      // So we spy on clicks here instead.
      sandbox.spy(tabElement, "click");
      component.getCachedState.returns(state);

      component.loadCachedState();

      expect(tabElement.click.callCount).to.equal(1);
    });

    it("will click any forecast quick-toggles that are set on the state", () => {
      const toggleIds = [
        "day1-quick-toggle-button",
        "day2-quick-toggle-button",
        "day3-quick-toggle-button",
      ];
      const state = {
        // The last two only
        togglesToClick: [toggleIds[1], toggleIds[2]],
      };
      const toggleElements = toggleIds.map((id) => {
        // Note: it's the parent h3 that handles the clicks,
        // in the current toggle implementation
        return document.getElementById(id).parentElement;
      });
      toggleElements.forEach((el) => {
        sandbox.spy(el, "click");
      });
      component.getCachedState.returns(state);

      component.loadCachedState();

      expect(toggleElements[0].click.callCount).to.equal(0);
      expect(toggleElements[1].click.callCount).to.equal(1);
      expect(toggleElements[2].click.callCount).to.equal(1);
    });

    it("clicking on of the forecast quick-toggle elements will add its id to the state", () => {
      component.getCachedState.restore();
      const secondQuickToggle = document.getElementById(
        "day2-quick-toggle-button",
      );
      expect(component.getCachedState().togglesToClick).to.have.length(0);

      // Note: because another component controls setting the toggle
      // state for these, we need to manually force that state change
      // here in the test in order to properly trigger the state saving
      secondQuickToggle.setAttribute("aria-expanded", "true");
      secondQuickToggle.click();

      expect(component.getCachedState().togglesToClick).includes(
        "day2-quick-toggle-button",
      );
    });

    it("will not add a duplicate ID to the quick toggle state if it's already present", () => {
      component.getCachedState.restore();
      component.setCachedStateItem("togglesToClick", [
        "day3-quick-toggle-button",
      ]);
      const initialState = component.getCachedState();
      expect(initialState.togglesToClick).to.have.length(1);
      expect(initialState.togglesToClick).includes("day3-quick-toggle-button");
      sandbox.spy(component, "setCachedStateItem");

      const button = document.getElementById("day3-quick-toggle-button");
      button.setAttribute("aria-expanded", "true");
      button.click();

      expect(component.setCachedStateItem.callCount).to.equal(1);
      const finalState = component.getCachedState();
      expect(finalState.togglesToClick).to.have.length(1);
      expect(finalState.togglesToClick).includes("day3-quick-toggle-button");
    });

    it("will store the state of the charts/table toggle when clicked", () => {
      component.getCachedState.restore();
      const tab = document.getElementById("hourly-charts-tab_day2");

      // Note: the tabs throw a custom event, and that is handled
      // by a separate component. So we need to simulate it here.
      const event = new CustomEvent("wx-tab-focused", {
        detail: tab,
        bubbles: true,
      });
      tab.dispatchEvent(event);

      const finalState = component.getCachedState();
      expect(finalState.chartToggle).to.equal("charts");
    });

    afterEach(() => {
      sandbox.restore();
    });
  });

  // AI-assisted regression coverage for native, responsive day tabs.
  describe("Responsive day tabs", () => {
    const markup = `<wx-daily-forecast cache="true">
      <div class="wx-quick-forecast" data-tablist-label="Daily forecast">
        <button type="button" class="wx-quick-forecast-item" id="day1-tab"><time id="day1-date"><span>Today</span> 11/02</time><span>Sunny High 70 Low 50</span></button>
        <button type="button" class="wx-quick-forecast-item" id="day2-tab"><time id="day2-date"><span>Tuesday</span> 11/03</time><span>Cloudy High 65 Low 45</span></button>
      </div>
      <ol class="wx-forecast-list">
        <li><div class="wx-daily-forecast-list-item-inner" id="day1-inner"><button class="details-tab" role="tab">Table</button><input></div></li>
        <li><div class="wx-daily-forecast-list-item-inner" id="day2-inner"></div></li>
      </ol>
    </wx-daily-forecast>`;

    afterEach(() => {
      document.body.innerHTML = "";
      sandbox.restore();
      window.matchMedia.returns({
        matches: true,
        addEventListener: stub(),
        removeEventListener: stub(),
      });
    });

    for (const desktop of [true, false]) {
      for (const cached of [true, false]) {
        it(`selects the ${cached ? "cached" : "first"} day on ${desktop ? "desktop" : "mobile"} without clicking a button`, () => {
          window.matchMedia.returns({
            matches: desktop,
            addEventListener: stub(),
            removeEventListener: stub(),
          });
          const container = document.createElement("div");
          container.innerHTML = markup;
          const component = container.querySelector("wx-daily-forecast");
          const links = Array.from(
            component.querySelectorAll(".wx-quick-forecast-item"),
          );
          const clicks = links.map((link) => sandbox.spy(link, "click"));
          sandbox
            .stub(component, "getCachedState")
            .returns(cached ? { quickForecastItem: { id: "day2-tab" } } : null);
          sandbox.stub(component, "setCachedStateItem");
          const initialUrl = window.location.href;

          document.body.replaceChildren(component);

          const selectedIndex = cached ? 1 : 0;
          links.forEach((link, index) => {
            expect(clicks[index].callCount).to.equal(0);
            expect(link.getAttribute("aria-selected")).to.equal(
              desktop ? String(index === selectedIndex) : null,
            );
            expect(link.getAttribute("tabindex")).to.equal(
              desktop ? (index === selectedIndex ? "0" : "-1") : null,
            );
            expect(
              component
                .querySelector(`#day${index + 1}-inner`)
                .getAttribute("data-tabpanel-active"),
            ).to.equal(String(index === selectedIndex));
          });
          expect(window.location.href).to.equal(initialUrl);

          // A mobile selection must still be active after resizing to desktop.
          component.desktopQuery.matches = true;
          component.handleDesktopMediaChange();
          expect(links[selectedIndex].getAttribute("aria-selected")).to.equal(
            "true",
          );
          expect(
            component
              .querySelector(`#day${selectedIndex + 1}-inner`)
              .getAttribute("data-tabpanel-active"),
          ).to.equal("true");
          expect(window.location.href).to.equal(initialUrl);
        });
      }
    }

    it("selects the clicked day when a desktop button's child is clicked", () => {
      document.body.innerHTML = markup;
      const component = document.querySelector("wx-daily-forecast");
      const link = component.querySelector("#day2-tab");
      const event = new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });

      link.querySelector("span").dispatchEvent(event);

      expect(event.defaultPrevented).to.equal(false);
      expect(link.getAttribute("aria-selected")).to.equal("true");
      expect(link.getAttribute("tabindex")).to.equal("0");
      expect(
        component.querySelector("#day1-tab").getAttribute("tabindex"),
      ).to.equal("-1");
      expect(
        component
          .querySelector("#day2-inner")
          .getAttribute("data-tabpanel-active"),
      ).to.equal("true");
    });

    it("labels the tablist and names focusable panels with only the day and date", () => {
      document.body.innerHTML = markup;
      const component = document.querySelector("wx-daily-forecast");
      const tablist = component.querySelector(".wx-quick-forecast");
      expect(tablist.getAttribute("role")).to.equal("tablist");
      expect(tablist.getAttribute("aria-label")).to.equal("Daily forecast");
      for (const day of [1, 2]) {
        const tab = component.querySelector(`#day${day}-tab`);
        const panel = component.querySelector(`#day${day}-inner`);
        expect(tab.tagName).to.equal("BUTTON");
        expect(tab.type).to.equal("button");
        expect(tab.getAttribute("role")).to.equal("tab");
        expect(tab.getAttribute("aria-controls")).to.equal(panel.id);
        expect(panel.getAttribute("role")).to.equal("tabpanel");
        const label = tab.querySelector("time");
        expect(panel.getAttribute("aria-labelledby")).to.equal(label.id);
        expect(
          document.getElementById(panel.getAttribute("aria-labelledby")),
        ).to.equal(label);
        expect(label.textContent).to.equal(
          day === 1 ? "Today 11/02" : "Tuesday 11/03",
        );
        expect(tab.textContent).to.include(
          day === 1 ? "Sunny High 70 Low 50" : "Cloudy High 65 Low 45",
        );
        expect(panel.getAttribute("tabindex")).to.equal("0");
      }
    });

    it("removes desktop semantics on mobile and restores the selected day on desktop", () => {
      document.body.innerHTML = markup;
      const component = document.querySelector("wx-daily-forecast");
      component.querySelector("#day2-tab").click();
      component.desktopQuery.matches = false;
      component.handleDesktopMediaChange();

      const tablist = component.querySelector(".wx-quick-forecast");
      expect(tablist.hasAttribute("role")).to.equal(false);
      expect(tablist.hasAttribute("aria-label")).to.equal(false);
      component.querySelectorAll(".wx-quick-forecast-item").forEach((tab) => {
        for (const attribute of [
          "role",
          "aria-controls",
          "aria-selected",
          "tabindex",
        ]) {
          expect(tab.hasAttribute(attribute), attribute).to.equal(false);
        }
      });
      component
        .querySelectorAll(".wx-daily-forecast-list-item-inner")
        .forEach((panel) => {
          for (const attribute of ["role", "aria-labelledby", "tabindex"]) {
            expect(panel.hasAttribute(attribute), attribute).to.equal(false);
          }
        });
      component.querySelector("#day1-tab").click();
      expect(
        component.querySelector("#day2-inner").dataset.tabpanelActive,
      ).to.equal("true");

      component.desktopQuery.matches = true;
      component.handleDesktopMediaChange();
      expect(
        component.querySelector("#day2-tab").getAttribute("aria-selected"),
      ).to.equal("true");
      expect(
        component.querySelector("#day2-tab").getAttribute("tabindex"),
      ).to.equal("0");
      expect(
        component.querySelector("#day1-tab").getAttribute("tabindex"),
      ).to.equal("-1");
    });

    for (const [key, start, end] of [
      ["ArrowRight", 1, 2],
      ["ArrowRight", 2, 1],
      ["ArrowLeft", 2, 1],
      ["ArrowLeft", 1, 2],
      ["Home", 2, 1],
      ["End", 1, 2],
    ]) {
      it(`${key} moves focus from day ${start} to day ${end} without activating it`, () => {
        document.body.innerHTML = markup;
        const component = document.querySelector("wx-daily-forecast");
        const startTab = component.querySelector(`#day${start}-tab`);
        startTab.click();
        startTab.focus();
        const event = new window.KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
        });
        startTab.dispatchEvent(event);
        expect(event.defaultPrevented).to.equal(true);
        expect(document.activeElement).to.equal(
          component.querySelector(`#day${end}-tab`),
        );
        expect(startTab.getAttribute("aria-selected")).to.equal("true");
        expect(startTab.getAttribute("tabindex")).to.equal("0");
      });
    }

    for (const key of [" ", "Enter"]) {
      it(`leaves ${JSON.stringify(key)} activation to the native button`, () => {
        document.body.innerHTML = markup;
        const tab = document.querySelector("#day2-tab");
        const click = sandbox.spy(tab, "click");
        const event = new window.KeyboardEvent("keydown", {
          key,
          code: key === " " ? "Space" : "Enter",
          bubbles: true,
          cancelable: true,
        });
        tab.dispatchEvent(event);
        expect(event.defaultPrevented).to.equal(false);
        expect(click.callCount).to.equal(0);
      });
    }

    it("does not intercept keyboard events from forecast content or nested tabs", () => {
      document.body.innerHTML = markup;
      for (const selector of [".details-tab", "input"]) {
        const target = document.querySelector(selector);
        target.focus();
        for (const key of [
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
          " ",
          "Enter",
        ]) {
          const event = new window.KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          });
          target.dispatchEvent(event);
          expect(event.defaultPrevented).to.equal(false);
          expect(document.activeElement).to.equal(target);
        }
      }
    });

    it("does not handle tab keyboard events in mobile mode", () => {
      document.body.innerHTML = markup;
      const component = document.querySelector("wx-daily-forecast");
      component.desktopQuery.matches = false;
      component.handleDesktopMediaChange();
      const tab = component.querySelector("#day1-tab");
      tab.focus();
      const event = new window.KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      tab.dispatchEvent(event);
      expect(event.defaultPrevented).to.equal(false);
      expect(document.activeElement).to.equal(tab);
    });
  });
});
