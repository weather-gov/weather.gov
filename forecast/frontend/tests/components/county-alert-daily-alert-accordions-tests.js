import { expect } from "chai";

describe("county daily alert accordions", () => {
  before(async () => {
    await import(
      "../../assets/js/components/county-alert-daily-alert-accordions.js"
    );
  });

  const containerIds = [
    "county-daily-alert-container-day-all",
    "county-daily-alert-container-day-1",
    "county-daily-alert-container-day-2",
    "county-daily-alert-container-day-3",
    "county-daily-alert-container-day-4",
    "county-daily-alert-container-day-5",
  ];

  beforeEach(() => {
    document.body.innerHTML = `
    <div id="county-daily-alert-container">
      <div id="county-daily-alert-container-day-all"></div>
      ${containerIds.map((id) => `<div id="${id}" class="display-none"></div>`)}
    </div>
    `;
  });

  it("does nothing if there's not an associated target", () => {
    window.dispatchEvent(
      new CustomEvent("wx-tab-focused", { detail: { id: "day-32-tab" } }),
    );

    [false, true, true, true, true, true].forEach((hidden, index) => {
      expect(
        document
          .getElementById(containerIds[index])
          .classList.contains("display-none"),
      ).to.equal(hidden);
    });
  });

  it("displays the correct accordion container", () => {
    window.dispatchEvent(
      new CustomEvent("wx-tab-focused", {
        detail: { id: "some-rando-tab", dataset: { alertDay: "3" } },
      }),
    );

    [true, true, true, false, true, true].forEach((hidden, index) => {
      expect(
        document
          .getElementById(containerIds[index])
          .classList.contains("display-none"),
      ).to.equal(hidden);
    });
  });

  it("if no ID is provided, selects the first tab", () => {
    // First, hide the first tab.
    document.getElementById(containerIds[0]);

    window.dispatchEvent(
      new CustomEvent("wx-tab-focused", { detail: { id: "" } }),
    );

    [false, true, true, true, true, true].forEach((hidden, index) => {
      expect(
        document
          .getElementById(containerIds[index])
          .classList.contains("display-none"),
      ).to.equal(hidden);
    });
  });
});
