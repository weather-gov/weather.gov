import { expect } from "chai";

describe("county page daily alerts", () => {
  before(async () => {
    await import(
      "../../assets/js/components/county-alert-daily-alert-handler.js"
    );
  });

  beforeEach(() => {
    document.body.innerHTML = `
    <wx-alerts>
      <div data-alert data-alert-day-1></div>
      <div data-alert data-alert-day-1></div>
      <div data-alert data-alert-day-2></div>
      <div data-alert data-alert-day-3></div>
      <div data-alert data-alert-day-3></div>
      <div data-alert data-alert-day-3></div>
      <div data-alert data-alert-day-4></div>
      <div data-alert data-alert-day-4></div>
      <div data-no-alerts-day="0"></div>
      <div data-no-alerts-day="1"></div>
      <div data-no-alerts-day="4"></div>
    </wx-alerts>
    <wx-alert-map>
      <div class="wx_alert_map_legend">
        <div data-alert-map-legend-level="warning"></div>
        <div data-alert-map-legend-level="watch"></div>
        <div data-alert-map-legend-level="other"></div>
        <div>county; should always be visible</div>
      </div>
    </wx-alert-map>
    `;
  });

  describe("alert accordions", () => {
    it("does nothing if there's not an associated target", () => {
      window.dispatchEvent(
        new CustomEvent("wx-tab-focused", {
          detail: { dataset: { alertDay: "day-32-tab" } },
        }),
      );

      const hiddenStatus = [
        ...document.querySelectorAll("wx-alerts > div[data-alert]"),
      ].map((node) => node.classList.contains("display-none"));

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

      const hiddenStatus = [
        ...document.querySelectorAll("wx-alerts > div[data-alert]"),
      ].map((node) => node.classList.contains("display-none"));

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

      const hiddenStatus = [
        ...document.querySelectorAll("wx-alerts > div[data-alert]"),
      ].map((node) => node.classList.contains("display-none"));

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
  });

  describe("alert map legends", () => {
    it("displays the correct map legend items for a day", () => {
      // First, hide all legends
      [...document.querySelectorAll("[data-alert-map-legend-level]")].forEach(
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
      [...document.querySelectorAll("[data-alert-map-legend-level]")].forEach(
        (node) => node.classList.add("display-none"),
      );

      window.dispatchEvent(
        new CustomEvent("wx-tab-focused", {
          detail: { dataset: { alertDay: "all" } },
        }),
      );

      console.log(document.querySelectorAll(".wx_alert_map_legend > div"));

      const hiddenStatus = [
        ...document.querySelectorAll(".wx_alert_map_legend > div"),
      ].map((node) => node.classList.contains("display-none"));

      expect(hiddenStatus).to.eql([false, false, false, false]);
    });
  });

  describe("text notices for days with no alerts", () => {
    it("when selecting the 'all' tab, only shows overview message", () => {
      // Troll the tests by starting with all of the text blocks showing
      [...document.querySelectorAll("[data-no-alert-day]")].forEach((node) =>
        node.classList.remove("display-none"),
      );

      window.dispatchEvent(
        new CustomEvent("wx-tab-focused", {
          detail: { dataset: { alertDay: "all" } },
        }),
      );

      const day0 = document.querySelector(`[data-no-alerts-day="0"]`);
      const day1 = document.querySelector(`[data-no-alerts-day="1"]`);
      const day4 = document.querySelector(`[data-no-alerts-day="4"]`);

      expect(day0.classList.contains("display-none")).to.eql(false);
      expect(day1.classList.contains("display-none")).to.eql(true);
      expect(day4.classList.contains("display-none")).to.eql(true);
    });

    it("shows text that is specific to the chosen day", () => {
      // This time, hide them all by default.
      [...document.querySelectorAll("[data-no-alert-day]")].forEach((node) =>
        node.classList.add("display-none"),
      );

      window.dispatchEvent(
        new CustomEvent("wx-tab-focused", {
          detail: { dataset: { alertDay: "1" } },
        }),
      );

      const day0 = document.querySelector(`[data-no-alerts-day="0"]`);
      const day1 = document.querySelector(`[data-no-alerts-day="1"]`);
      const day4 = document.querySelector(`[data-no-alerts-day="4"]`);

      expect(day0.classList.contains("display-none")).to.eql(true);
      expect(day1.classList.contains("display-none")).to.eql(false);
      expect(day4.classList.contains("display-none")).to.eql(true);
    });

    it("doesn't show any text if the selected day has alerts", () => {
      // Troll the tests by starting with all of the text blocks showing
      [...document.querySelectorAll("[data-no-alert-day]")].forEach((node) =>
        node.classList.remove("display-none"),
      );

      window.dispatchEvent(
        new CustomEvent("wx-tab-focused", {
          detail: { dataset: { alertDay: "3" } },
        }),
      );

      const day0 = document.querySelector(`[data-no-alerts-day="0"]`);
      const day1 = document.querySelector(`[data-no-alerts-day="1"]`);
      const day4 = document.querySelector(`[data-no-alerts-day="4"]`);

      expect(day0.classList.contains("display-none")).to.eql(true);
      expect(day1.classList.contains("display-none")).to.eql(true);
      expect(day4.classList.contains("display-none")).to.eql(true);
    });
  });
});
