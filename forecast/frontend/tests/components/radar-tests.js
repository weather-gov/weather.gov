import { expect } from "chai";

describe("Point radar initialization", () => {
  const targets = [];

  const radarMarkup = () => `
    <div wx-outer-radar-container>
      <div id="wx-radar-timestamp-label"></div>
      <wx-radar lat="34.749" lon="-92.275" data-timezone="America/Chicago">
        <div id="wx-radar-container"></div>
      </wx-radar>
      <a id="radar-point-link" href="https://radar.weather.gov/"></a>
    </div>
  `;

  beforeEach(() => {
    targets.length = 0;
    window.cmiRadar = {
      createApp: (selector) => {
        targets.push(selector);
        document.querySelector(selector).innerHTML =
          '<div class="cmi-radar-container"></div>';
        return {};
      },
    };
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.cmiRadar;
    delete window.app;
  });

  it("initializes the radar when Maps is the initial tab", async () => {
    document.body.innerHTML = `
      <div id="point-page-tabbed-nav">
        <div class="wx-tab-container" id="today"></div>
        <div class="wx-tab-container" id="maps" data-selected>${radarMarkup()}</div>
      </div>
    `;

    await import("../../assets/js/radar.js");

    expect(targets).to.deep.equal(["#maps #wx-radar-container"]);
    expect(document.querySelector("#maps .cmi-radar-container")).to.exist;
  });

  it("initializes the active Maps radar after a tab switch and asynchronous swap", () => {
    document.body.innerHTML = `
      <div id="point-page-tabbed-nav">
        <div class="wx-tab-container" id="today" data-selected>${radarMarkup()}</div>
        <div class="wx-tab-container" id="maps"></div>
      </div>
    `;
    document.dispatchEvent(
      new CustomEvent("wx:tab-switched", { detail: { tabId: "today" } }),
    );
    expect(targets).to.deep.equal(["#today #wx-radar-container"]);

    document.querySelector("#today").removeAttribute("data-selected");
    const maps = document.querySelector("#maps");
    maps.setAttribute("data-selected", "");
    document.dispatchEvent(
      new CustomEvent("wx:tab-switched", { detail: { tabId: "maps" } }),
    );
    expect(targets).to.have.length(1);

    maps.innerHTML = radarMarkup();
    document.dispatchEvent(
      new CustomEvent("wx:tab-content-loaded", { detail: { tabId: "maps" } }),
    );
    expect(targets).to.deep.equal([
      "#today #wx-radar-container",
      "#maps #wx-radar-container",
    ]);
    expect(maps.querySelector(".cmi-radar-container")).to.exist;
    expect(maps.querySelector("#radar-point-link").href).to.contain(
      "?settings=v1_",
    );

    document.dispatchEvent(
      new CustomEvent("wx:tab-content-loaded", { detail: { tabId: "maps" } }),
    );
    expect(targets).to.have.length(2);
  });
});
