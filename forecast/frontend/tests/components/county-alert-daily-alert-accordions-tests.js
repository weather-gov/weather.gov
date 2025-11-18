import { expect } from "chai";

describe("county daily alert accordions", () => {
  before(async () => {
    await import(
      "../../assets/js/components/county-alert-daily-alert-accordions.js"
    );
  });

  beforeEach(() => {
    document.body.innerHTML = `
    <wx-alerts>
      <div data-alert-day-1></div>
      <div data-alert-day-1></div>
      <div data-alert-day-2></div>
      <div data-alert-day-3></div>
      <div data-alert-day-3></div>
      <div data-alert-day-3></div>
      <div data-alert-day-4></div>
      <div data-alert-day-4></div>
    </wx-alerts>
    <wx-alert-map>
      <div class="wx_alert_map_legend">
        <div id="wx-alert-legend-level-warning"></div>
        <div id="wx-alert-legend-level-watch"></div>
        <div id="wx-alert-legend-level-other"></div>
        <div>county; should always be visible</div>
      </div>
    </wx-alert-map>
    `;
  });

  it("hides every alert if there's not an associated target", () => {
    window.dispatchEvent(
      new CustomEvent("wx-tab-focused", {
        detail: { dataset: { alertDay: "day-32-tab" } },
      }),
    );

    const hiddenStatus = [...document.querySelectorAll("wx-alerts > div")].map(
      (node) => node.classList.contains("display-none"),
    );

    expect(hiddenStatus).to.eql([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
  });

  it("displays the correct accordion container", () => {
    window.dispatchEvent(
      new CustomEvent("wx-tab-focused", {
        detail: { id: "some-rando-tab", dataset: { alertDay: "3" } },
      }),
    );

    const hiddenStatus = [...document.querySelectorAll("wx-alerts > div")].map(
      (node) => node.classList.contains("display-none"),
    );

    expect(hiddenStatus).to.eql([
      true,
      true,
      true,
      false,
      false,
      false,
      true,
      true,
    ]);
  });

  it("if the day is set to 'all', selects the first tab", () => {
    // First, hide the first tab.
    document.querySelector("wx-alerts > div").classList.add("display-none");

    window.dispatchEvent(
      new CustomEvent("wx-tab-focused", {
        detail: { dataset: { alertDay: "all" } },
      }),
    );

    const hiddenStatus = [...document.querySelectorAll("wx-alerts > div")].map(
      (node) => node.classList.contains("display-none"),
    );

    expect(hiddenStatus).to.eql([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("displays the correct map legend items for a day", () => {
    // First, hide all legends
    [...document.querySelectorAll(".wx_alert_map_legend > div[id]")].forEach(
      (node) => node.classList.add("display-none"),
    );

    window.dispatchEvent(
      new CustomEvent("wx-tab-focused", {
        detail: { dataset: { alertDay: "1", alertLevels: "warning other" } },
      }),
    );

    const hiddenStatus = [
      ...document.querySelectorAll(".wx_alert_map_legend > div"),
    ].map((node) => node.classList.contains("display-none"));

    expect(hiddenStatus).to.eql([false, true, false, false]);
  });

  it("shows all legends for 'all' day", () => {
    // First, hide all legends
    [...document.querySelectorAll(".wx_alert_map_legend > div[id]")].forEach(
      (node) => node.classList.add("display-none"),
    );

    window.dispatchEvent(
      new CustomEvent("wx-tab-focused", {
        detail: { dataset: { alertDay: "all" } },
      }),
    );

    const hiddenStatus = [
      ...document.querySelectorAll(".wx_alert_map_legend > div"),
    ].map((node) => node.classList.contains("display-none"));

    expect(hiddenStatus).to.eql([false, false, false, false]);
  });
});
