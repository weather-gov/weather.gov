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
  window.matchMedia.returns(
    document.createElement("div")
  );
});

describe("DailyForecast.js component tests", () => {
  describe("Loading and saving cached state", () => {
    const defaultMarkup = `<wx-daily-forecast cache="true">
    <nav class="wx-quick-forecast">
        <a class="wx-quick-forecast-item" href="#day1" id="day1-quick-forecast-button"></a>
        <a class="wx-quick-forecast-item" href="#day2" id="day2-quick-forecast-button"></a>
        <a class="wx-quick-forecast-item" href="#day3" id="day3-quick-forecast-button"></a>
    </nav>
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
      const firstItem = component.querySelector(".wx-quick-forecast-item:first-child");
      sandbox.spy(firstItem, "click");

      component.loadCachedState();

      expect(firstItem.click.callCount).to.equal(1);
      expect(firstItem.getAttribute("aria-selected")).to.equal("true");
    });

    it("will activate a given quick forecast item if it is in the state", () => {
      const state = {
        quickForecastItem: {
          id: "day2-quick-forecast-button"
        }
      };
      const expectedItem = document.getElementById("day2-quick-forecast-button");
      component.getCachedState.returns(state);


      expect(expectedItem.getAttribute("aria-selected")).to.equal("false");
      
      component.loadCachedState();

      expect(expectedItem.getAttribute("aria-selected")).to.equal("true");
    });

    it("will click the appropriate charts/table toggle if the state is set", () => {
      const state = { chartToggle: "hourly-charts-tab_day2"};
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
        togglesToClick: [toggleIds[1], toggleIds[2]]
      };
      const toggleElements = toggleIds.map(id => {
        // Note: it's the parent h3 that handles the clicks,
        // in the current toggle implementation
        return document.getElementById(id).parentElement;
      });
      toggleElements.forEach(el => {
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
      const secondQuickToggle = document.getElementById("day2-quick-toggle-button");
      expect(component.getCachedState().togglesToClick).to.have.length(0);

      // Note: because another component controls setting the toggle
      // state for these, we need to manually force that state change
      // here in the test in order to properly trigger the state saving
      secondQuickToggle.setAttribute("aria-expanded", "true");
      secondQuickToggle.click();
      
      expect(component.getCachedState().togglesToClick).includes("day2-quick-toggle-button");
    });

    it("will not add a duplicate ID to the quick toggle state if it's already present", () => {
      component.getCachedState.restore();
      component.setCachedStateItem("togglesToClick", ["day3-quick-toggle-button"]);
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
      const event = new CustomEvent("wx-tab-focused", {detail: tab, bubbles: true});
      tab.dispatchEvent(event);

      const finalState = component.getCachedState();
      expect(finalState.chartToggle).to.equal("charts");
    });
    

    afterEach(() => {
      sandbox.restore();
    });
  });
});
