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
});
