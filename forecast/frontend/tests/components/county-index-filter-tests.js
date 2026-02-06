import fs from "node:fs/promises";
import path from "node:path";
import {stub, createSandbox } from "sinon";
import { expect } from "chai";

const exampleHtmlPath = path.join(
  path.dirname(import.meta.filename),
      "data",
      "county-filter-example.html"
    );

let exampleHtml;

const wait = async (milliseconds) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
};

describe("County index filter tests", () => {
  before(async () => {
    exampleHtml = await fs.readFile(exampleHtmlPath);
    exampleHtml = exampleHtml.toString();

    // After all the globals are setup, now we can import the component(s) being
    // tested. The imports will unwind themselves and it'll use the globals we
    // defined above to register itself with our DOM.
    await import("../../assets/js/components/combobox/filterable-listbox.js");
    await import("../../assets/js/components/combobox/combobox.js");
    await import("../../assets/js/components/county-index-filter.js");

    // JSDOM does not have the `scrollIntoView` method,
    // so we need to stub it out here on all elements
    window.HTMLElement.prototype.scrollIntoView = stub();
    stub(window.HTMLFormElement.prototype, "submit");
  });

  beforeEach(() => {
    // Set the body innerHTML to the loaded example file
    document.body.innerHTML = exampleHtml;
  });

  it("Has component registered for the county index filter", () => {
    const component = window.customElements.get("wx-county-index-filter");

    expect(component).to.exist;
  });

  it("Selecting a state from the list hides the other states from view", async () => {
    // Find Virginia in the states list
    const listbox = document.getElementById("state-filter-listbox");
    const virginiaItem = listbox.querySelector("#VA");
    virginiaItem.click();

    await wait(100);

    // The selected item in the list box is VA
    expect(listbox.querySelector(`[aria-selected="true"]`).id).to.equal("VA");

    // We expect the virginia results to be shown
    const virginia = document.querySelector(`[data-state-abbrev="VA"]`);
    expect(virginia).to.exist;

    // We expect that there are no other states
    const others = Array.from(
      document.querySelectorAll(`[data-filter-by="state"]:not([data-state-abbrev="VA"])`)
    );
    expect(others.length).to.equal(0);
  });

  it("Filtering by counties with 's' in the name only shows those counties and their corresponding states", async () => {
    const inputFilter = document.querySelector(`input[id="county-filter-input"]`);
    inputFilter.value = "s";
    inputFilter.dispatchEvent(
      new Event("input", {
        bubbles: true,
        cancelable: true
      })
    );

    await wait(100);

    // The names of the expected counties to query for
    const expectedCounties = [
      "sisko",
      "flurries",
      "snow"
    ];

    // These counties should be shown, ie
    // _not_filtered out
    expectedCounties.map(countyName => {
      return document.querySelector(`[data-county-name="${countyName}"]`);
    }).forEach(element => {
      expect(element).to.exist;
    });

    const expectedHiddenCounties = [
      "garak",
      "odo",
      "blizzard",
      "aardvark",
      "elephant",
      "zebra"
    ];

    // These counties should be hidden, ie
    // should be filtered out
    expectedHiddenCounties.map(countyName => {
      return document.querySelector(`[data-county-name="${countyName}"]`);
    }).forEach(element => {
      expect(element).to.not.exist;
    });
  });

  it("ignores case when filtering", async () => {
    const inputFilter = document.querySelector(`input[id="county-filter-input"]`);
    inputFilter.value = "F";
    inputFilter.dispatchEvent(
      new Event("input", {
        bubbles: true,
        cancelable: true
      })
    );

    await wait(100);

    // We expect to have Flurries county represented, even though
    // the [dta-county-name] is all in lowercase
    const flurries = document.querySelector(`[data-county-name="flurries"]`);
    expect(flurries).to.exist;
  });

  describe("aria-live functionality", () => {
    let sandbox;
    before(() => {
      sandbox = createSandbox();
      if(!window.ngettext){
        window.ngettext = function(){};
      }
      sandbox.stub(window, "ngettext");
      window.ngettext.returns("");
      if(!window.gettext){
        window.gettext = function(){};
      }
      sandbox.stub(window, "gettext");
      window.gettext.returns("");
      if(!window.interpolate){
        window.interpolate = function(){};
      }
      sandbox.stub(window, "interpolate");
      if(!window.ngettext){
        window.ngettext = function(){};
      }
      window.interpolate.returns("");
    });

    after(() => {
      sandbox.restore();
    });
    
    it("triggers a wx-announce event when filtered", async () => {
      const component = document.querySelector("wx-county-index-filter");
      sandbox.spy(window, "dispatchEvent");

      component.filter();

      await wait(20);

      expect(window.dispatchEvent.callCount).to.equal(1);
      const spyCall = window.dispatchEvent.getCall(0);
      expect(spyCall.args[0].type).to.equal("wx-announce");
    });
  });

  it("Shows only non-filtered counties when a single state is selected", async () => {
    const listbox = document.getElementById("state-filter-listbox");
    const filterInput = document.querySelector(
      `input[id="county-filter-input"]`,
    );

    // Select Alaska as the state to show
    const alaskaItem = listbox.querySelector("#AK");
    alaskaItem.click();

    // Add 's' to the county filter
    filterInput.value = "sn";
    filterInput.dispatchEvent(
      new Event("input", {
        bubbles: true,
        cancelable: true
      })
    );

    await wait(100);

    // We expect only alaska to be displayed
    const alaska = document.querySelector(`[data-filter-by="state"][data-state-abbrev="AK"]`);
    expect(alaska).to.exist;
    Array.from(
      document.querySelectorAll(`[data-filter-by="state"]:not([data-state-abbrev="AK"])`)
    ).forEach(nonAlaska => {
      expect(nonAlaska).to.not.exist;
    });

    // Within Alaska, only Snow County should be showing
    // ie, others should be filtered out
    const snowCounty = alaska.querySelector(`[data-county-name="snow"]`);
    expect(snowCounty).to.exist;
    const hiddenCounties = Array.from(
      alaska.querySelectorAll(`[data-filter-by="county"].display-none`)
    );
    
    expect(hiddenCounties).to.have.length(0);
  });
});
