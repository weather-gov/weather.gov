/* eslint no-unused-expressions: off */

import { createSandbox, stub } from "sinon";
import { assert, expect } from "chai";

// JSDOM does not have the `scrollIntoView` method,
// so we need to stub it out here on all elements
window.HTMLElement.prototype.scrollIntoView = stub();
window.HTMLFormElement.prototype.submit = stub();

const wait = async (milliseconds) => {
  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
};

const SEARCH_RESULTS = {
  suggestions: [
    {
      text: "Arlington, TX, USA",
      magicKey:
        "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFRYLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=",
      isCollection: false,
    },
    {
      text: "Arlington, VA, USA",
      magicKey:
        "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFZBLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=",
      isCollection: false,
    },
    {
      text: "Arlington Heights, IL, USA (Cook County)",
      magicKey:
        "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24gSGVpZ2h0cywgSUwsIFVTQSAoQ29vayBDb3VudHkpI3NjPVVTQTpQUkk6VklSOkdVTTpBU00jbmVsPSNsbmc9NDAjbG49V29ybGQ=",
      isCollection: false,
    },
    {
      text: "Arlington, MA, USA",
      magicKey:
        "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIE1BLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=",
      isCollection: false,
    },
  ],
};

const SEARCH_RESULT_ITEMS = {
  "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFRYLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=":
    {
      spatialReference: {
        wkid: 4326,
        latestWkid: 4326,
      },
      locations: [
        {
          name: "Arlington, Texas",
          extent: {
            xmin: -97.23211,
            ymin: 32.610594,
            xmax: -96.98211,
            ymax: 32.860594,
          },
          feature: {
            geometry: {
              x: -97.10711,
              y: 32.735594,
            },
            attributes: {
              Score: 100,
              Addr_Type: "Locality",
            },
          },
        },
      ],
    },
  "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFZBLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=":
    {
      spatialReference: {
        wkid: 4326,
        latestWkid: 4326,
      },
      locations: [
        {
          name: "Arlington, Virginia",
          extent: {
            xmin: -77.146755,
            ymin: 38.828763,
            xmax: -77.022755,
            ymax: 38.952763,
          },
          feature: {
            geometry: {
              x: -77.084755,
              y: 38.890763,
            },
            attributes: {
              Score: 100,
              Addr_Type: "Locality",
            },
          },
        },
      ],
    },
  "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24gSGVpZ2h0cywgSUwsIFVTQSAoQ29vayBDb3VudHkpI3NjPVVTQTpQUkk6VklSOkdVTTpBU00jbmVsPSNsbmc9NDAjbG49V29ybGQ=":
    {
      spatialReference: {
        wkid: 4326,
        latestWkid: 4326,
      },
      locations: [
        {
          name: "Arlington Heights, Illinois",
          extent: {
            xmin: -88.0344577,
            ymin: 42.0289775,
            xmax: -87.9264577,
            ymax: 42.1369775,
          },
          feature: {
            geometry: {
              x: -87.9804577,
              y: 42.0829775,
            },
            attributes: {
              Score: 100,
              Addr_Type: "Locality",
            },
          },
        },
      ],
    },
  "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIE1BLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=":
    {
      spatialReference: {
        wkid: 4326,
        latestWkid: 4326,
      },
      locations: [
        {
          name: "Arlington, Massachusetts",
          extent: {
            xmin: -71.183669,
            ymin: 42.389249,
            xmax: -71.129669,
            ymax: 42.443249,
          },
          feature: {
            geometry: {
              x: -71.156669,
              y: 42.416249,
            },
            attributes: {
              Score: 100,
              Addr_Type: "Locality",
            },
          },
        },
      ],
    },
};

window.fetch = async (url) => {
  const parsedUrl = new URL(url);
  if (parsedUrl.pathname.includes("suggest")) {
    return window.Promise.resolve(
      new Response(JSON.stringify(SEARCH_RESULTS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  const key = parsedUrl.searchParams.get("magicKey");
  const data = SEARCH_RESULT_ITEMS[key];

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

describe("Combo box unit tests", () => {
  before(async () => {
    // After all the globals are setup, now we can import the component being
    // tested. The imports will unwind themselves and it'll use the globals we
    // defined above to register itself with our DOM.
    await import("../../assets/js/components/combo-box-location.js");
  });

  beforeEach(() => {
    document.body.innerHTML = "";
    const box = document.createElement("wx-combo-box-location");
    document.body.append(box);
  });

  it("Has the element", () => {
    assert.exists(document.querySelector("wx-combo-box-location"));
    assert.exists(window.customElements.get("wx-combo-box-location"));
  });

  it("Element has the correct auto-generated id", () => {
    const component = document.querySelector("wx-combo-box-location");
    const expected = "combo-box-2";
    const actual = component.id;

    expect(expected).to.equal(actual);
  });

  describe("Input initialization", () => {
    it("Adds an input element automatically", () => {
      expect(document.querySelector("wx-combo-box-location > input")).to.exist;
    });

    it("Adds the correct aria-related attributes to the input", () => {
      const input = document.querySelector("wx-combo-box-location > input");
      const attrs = [
        ["role", "combobox"],
        ["aria-owns", "combo-box-4--list"],
        ["aria-controls", "combo-box-4--list"],
        ["aria-autocomplete", "none"],
        ["aria-activedescendant", ""],
        ["autocomplete", "off"],
        ["autocapitalize", "off"],
      ];

      attrs.forEach((pair) => {
        const attr = pair[0];
        const expected = pair[1];
        const actual = input.getAttribute(attr);

        expect(actual).to.equal(expected);
      });
    });
  });

  describe("listbox initialization", () => {
    it("Adds a listbox list wrapper automatically", () => {
      expect(document.querySelector("wx-combo-box-location > div")).to.exist;
    });

    it("Adds the expected id automatically", () => {
      const expected = "combo-box-6--list";
      const actual = document.querySelector("wx-combo-box-location div").id;

      expect(actual).to.equal(expected);
    });

    it("Adds the correct aria-related attributes", () => {
      const listbox = document.querySelector("wx-combo-box-location > div");
      const attrs = [["role", "listbox"]];

      attrs.forEach((pair) => {
        const attr = pair[0];
        const expected = pair[1];
        const actual = listbox.getAttribute(attr);

        expect(actual).to.equal(expected);
      });
    });
  });

  describe("Input event and search update tests", () => {
    let sandbox;
    beforeEach(() => {
      sandbox = createSandbox();
      document.body.innerHTML = "";
      const box = document.createElement("wx-combo-box-location");
      document.body.append(box);
      assert.exists(window.customElements.get("wx-combo-box-location"));
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("Expects the component's updateSearch method to have been called on input", async () => {
      const event = new window.Event("input", { bubbles: true });
      const component = document.querySelector("wx-combo-box-location");
      const input = component.querySelector("input");
      input.focus();
      input.value = "Arlin";
      sandbox.spy(component, "updateSearch");
      input.dispatchEvent(event);

      await wait(500);
      expect(component.updateSearch.calledOnce).to.be.true;
      expect(component.updateSearch.calledWith("Arlin")).to.be.true;
    });

    it("Expects showList to have been called when updateSearch completes", async () => {
      const component = document.querySelector("wx-combo-box-location");
      sandbox.spy(component, "showList");
      await component.updateSearch("Arlin");

      expect(component.showList.calledOnce).to.be.true;
    });

    it("Expects showList / hideList to toggle aria-expanded (input) and expanded (element)", async () => {
      const component = document.querySelector("wx-combo-box-location");
      component.showList();
      expect(component.getAttribute("expanded")).to.equal("true");
      expect(component.input.getAttribute("aria-expanded")).to.equal("true");
      component.hideList();
      expect(component.input.getAttribute("aria-expanded")).to.equal("false");
      expect(component.getAttribute("expanded")).to.equal("false");
    });
  });

  describe("List navigation tests", () => {
    let sandbox;
    beforeEach(async () => {
      sandbox = createSandbox();
      document.body.innerHTML = "";
      const box = document.createElement("wx-combo-box-location");
      document.body.append(box);
      assert.exists(window.customElements.get("wx-combo-box-location"));
      await box.updateSearch("Arlin");
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("Selects the first element in the dropdown automatically", () => {
      const component = document.querySelector("wx-combo-box-location");
      const listbox = component.querySelector("ul");
      const firstItem = listbox.querySelector("li:first-child");
      const actual = firstItem.getAttribute("aria-selected");

      expect(actual).to.equal("true");
    });

    it("Selects the second element in the list when the down arrow is pushed", () => {
      const event = new window.KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
      });
      const component = document.querySelector("wx-combo-box-location");
      const listbox = component.querySelector("ul");
      const input = component.querySelector("input[slot='input']");
      input.focus();
      input.dispatchEvent(event);
      const selectedItemCount = listbox.querySelectorAll(
        "li[aria-selected='true']",
      ).length;
      const secondItem = listbox.querySelector("li:nth-child(2)");
      const actual = secondItem.getAttribute("aria-selected");

      expect(actual).to.equal("true");
      expect(selectedItemCount).to.equal(1);
    });

    it("Hides the result list if up is pressed while on the first item", () => {
      const event = new window.KeyboardEvent("keydown", {
        key: "ArrowUp",
        bubbles: true,
      });
      const component = document.querySelector("wx-combo-box-location");
      const input = component.querySelector("input[slot='input']");
      input.focus();

      expect(component.isShowingList).to.be.true;
      input.dispatchEvent(event);
      expect(component.isShowingList).to.be.false;
    });

    it("Does nothing when pushing down arrow when the last item is selected", () => {
      const event = new window.KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
      });
      const component = document.querySelector("wx-combo-box-location");
      const listbox = component.querySelector("ul");
      const input = component.querySelector("input[slot='input']");
      listbox
        .querySelector("li[aria-selected='true']")
        .setAttribute("aria-selected", "false");
      const lastItem = listbox.querySelector("li:last-child");
      lastItem.setAttribute("aria-selected", "true");
      input.focus();
      input.dispatchEvent(event);

      expect(component.isShowingList).to.be.true;
      expect(lastItem.getAttribute("aria-selected")).to.equal("true");
    });

    it("Hides the result list if the input loses focus", () => {
      const component = document.querySelector("wx-combo-box-location");
      expect(component.isShowingList).to.be.true;

      const event = new window.FocusEvent("blur", { bubbles: true });
      component.input.dispatchEvent(event);

      expect(component.isShowingList).to.be.false;
    });
  });

  describe("Choosing an option", () => {
    let sandbox;
    beforeEach(async () => {
      sandbox = createSandbox();
      document.body.innerHTML = "";
      const box = document.createElement("wx-combo-box-location");
      document.body.append(box);
      assert.exists(window.customElements.get("wx-combo-box-location"));
      await box.updateSearch("Arlin");
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("When pushing Enter when the second item is selected _and_ submitted", () => {
      const component = document.querySelector("wx-combo-box-location");
      component.showList();
      const secondItem = component.querySelector(
        "div[role='listbox'] > ul > li[role='option']:nth-child(2)",
      );
      component.pseudoFocusListItem(secondItem);
      const spied = sandbox.spy(component, "submit");

      const event = new window.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      });
      component.input.dispatchEvent(event);

      const expectedValue = secondItem.dataset.value;
      const actualValue = component.value;

      expect(expectedValue).to.equal(actualValue);
      expect(spied.called).to.be.true;
    });

    it("When clicking the second item, it is selected and submit is called", () => {
      const component = document.querySelector("wx-combo-box-location");
      const secondItem = component.querySelector(
        "div[role='listbox'] > ul > li:nth-child(2)",
      );
      const spied = sandbox.spy(component, "submit");

      secondItem.click();

      const expected = secondItem.dataset.value;
      const actual = component.value;

      expect(expected).to.equal(actual);
      expect(spied.called).to.be.true;
    });

    it("Can get the geodata from a value key", async () => {
      const component = document.querySelector("wx-combo-box-location");
      const secondItem = component.querySelector(
        "div[role='listbox'] > ul > li:nth-child(2)",
      );
      component.value = secondItem.dataset.value;
      const geodata = await component.getGeodataForKey(component.value);

      const expected = {
        lon: -77.085,
        lat: 38.891,
      };

      expect(expected).to.deep.equal(geodata);
    });

    it("Updates the parent form action with the correct value on submit", async () => {
      const component = document.querySelector("wx-combo-box-location");
      const form = document.createElement("form");
      form.setAttribute("data-location-search", "");
      form.append(component);
      form.submit = sandbox.spy();
      document.body.append(form);
      const secondItem = component.querySelector(
        "div[role='listbox'] > ul > li:nth-child(2)",
      );
      component.value = secondItem.dataset.value;
      await component.submit();

      const expected = "/point/38.891/-77.085";
      const actual = form.getAttribute("action");

      expect(expected).to.equal(actual);
      expect(form.submit.called).to.be.true;
    });
  });

  describe("saved search results", () => {
    let box;
    const sandbox = createSandbox();
    const form = document.createElement("form");
    const response = { json: sandbox.stub() };
    form.setAttribute("data-location-search", true);

    const { fetch } = global;

    before(() => {
      global.localStorage = {
        getItem: sandbox.stub(),
        setItem: sandbox.stub(),
      };

      global.fetch = sandbox.stub();
    });

    after(() => {
      global.fetch = fetch;
    });

    beforeEach(async () => {
      sandbox.resetBehavior();
      sandbox.resetHistory();

      global.fetch.resolves(response);

      document.body.innerHTML = "";
      box = document.createElement("wx-combo-box-location");
      document.body.append(form);
      form.append(box);
    });

    describe("saves results", () => {
      beforeEach(async () => {
        await box.updateSearch("Arlin");
      });

      it("when a user chooses a location", () => {
        const component = document.querySelector("wx-combo-box-location");
        component.input.value = "chosen place";
        component.url = "https://place.com";
        component.submit();

        expect(
          global.localStorage.setItem.calledWith(
            "wxgov_recent_locations",
            JSON.stringify([
              { text: "chosen place", url: "https://place.com" },
            ]),
          ),
        ).to.be.true;
      });

      it("when a user loads a location page", () => {
        document.body.innerHTML = "";
        const component = document.createElement("wx-combo-box-location");
        component.setAttribute("data-place", "Placeville, ST");
        document.body.append(form);
        form.append(component);

        expect(
          global.localStorage.setItem.calledWith(
            "wxgov_recent_locations",
            JSON.stringify([{ text: "Placeville, ST", url: "/" }]),
          ),
        ).to.be.true;
      });

      it("adds new result at the front of the list if prior results exist", () => {
        const previous = ["previous entry 1", "previosu entry 2"];
        global.localStorage.getItem
          .withArgs("wxgov_recent_locations")
          .returns(JSON.stringify(previous));

        const component = document.querySelector("wx-combo-box-location");
        component.input.value = "chosen place";
        component.url = "https://place.com";
        component.submit();

        expect(
          global.localStorage.setItem.calledWith(
            "wxgov_recent_locations",
            JSON.stringify([
              { text: "chosen place", url: "https://place.com" },
              ...previous,
            ]),
          ),
        ).to.be.true;
      });

      it("removes existing items with the same url", () => {
        const previous = [
          "previous entry 1",
          { text: "previous entry 2", url: "https://place.com" },
          "previous entry 3",
        ];
        global.localStorage.getItem
          .withArgs("wxgov_recent_locations")
          .returns(JSON.stringify(previous));

        const component = document.querySelector("wx-combo-box-location");
        component.input.value = "chosen place";
        component.url = "https://place.com";
        component.submit();

        expect(
          global.localStorage.setItem.calledWith(
            "wxgov_recent_locations",
            JSON.stringify([
              { text: "chosen place", url: "https://place.com" },
              previous[0],
              previous[2],
            ]),
          ),
        ).to.be.true;
      });
    });

    describe("shows previously-saved results", () => {
      beforeEach(async () => {
        document.body.innerHTML = "";
        box = document.createElement("wx-combo-box-location");
        document.body.append(box);

        response.ok = true;
      });

      it("shows saved results if there are no search results", async () => {
        response.json.resolves({ suggestions: [] });
        global.localStorage.getItem.returns(
          JSON.stringify([{ text: "saved result", url: "https:/com.place" }]),
        );

        const component = document.querySelector("wx-combo-box-location");
        component.updateSearch("");
        await wait(0);
        const items = component.querySelectorAll(
          `[role="listbox"] li[role="option"]`,
        );

        expect(items.length).to.equal(1);
        expect(items.item(0).innerText).to.equal("saved result");
      });

      it("shows saved results alongside search results", async () => {
        response.json.resolves({
          suggestions: [
            { text: "search 1", magicKey: 1 },
            { text: "search 2", magicKey: 2 },
            { text: "search 3", magicKey: 3 },
          ],
        });
        global.localStorage.getItem.returns(
          JSON.stringify([{ text: "saved result", url: "https:/com.place" }]),
        );

        const component = document.querySelector("wx-combo-box-location");
        component.updateSearch("");
        await wait(0);
        const items = component.querySelectorAll(
          `[role="listbox"] li[role="option"]`,
        );

        expect(items.length).to.equal(4);
        expect(items.item(0).innerText).to.equal("saved result");
      });

      it("only shows saved results that match the provided text", async () => {
        response.json.resolves({
          suggestions: [
            { text: "search 1", magicKey: 1 },
            { text: "search 2", magicKey: 2 },
            { text: "search 3", magicKey: 3 },
          ],
        });
        global.localStorage.getItem.returns(
          JSON.stringify([
            { text: "saved result", url: "https:/com.place1" },
            { text: "result that is saved", url: "https:/com.place2" },
            { text: "another saved result", url: "https:/com.place3" },
          ]),
        );

        const component = document.querySelector("wx-combo-box-location");
        component.updateSearch("res");
        await wait(0);
        const items = component.querySelectorAll(
          `[role="listbox"] li[role="option"]`,
        );

        expect(items.length).to.equal(4);
        expect(items.item(0).innerText).to.equal("result that is saved");
      });
    });

    describe("keeps a limited number of saved results", () => {
      it("only keeps 10 recent results", () => {
        global.localStorage.getItem
          .withArgs("wxgov_recent_locations")
          .returns(
            JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
          );

        const component = document.querySelector("wx-combo-box-location");
        component.saveSearchResult({ url: "new" });

        expect(
          global.localStorage.setItem.calledWith(
            "wxgov_recent_locations",
            JSON.stringify([{ url: "new" }, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
          ),
        ).to.be.true;
      });

      it("returns only 3 results", () => {
        global.localStorage.getItem
          .withArgs("wxgov_recent_locations")
          .returns(
            JSON.stringify([
              { text: 1 },
              { text: 2 },
              { text: 3 },
              { text: 4 },
              { text: 5 },
            ]),
          );

        const component = document.querySelector("wx-combo-box-location");
        const results = component.getSavedResults("");

        // deep equality, not reference equality
        expect(results).to.eql([{ text: 1 }, { text: 2 }, { text: 3 }]);
      });
    });
  });
});
