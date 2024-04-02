/* eslint no-unused-expressions: off */
require("jsdom-global")();
require("../../assets/js/components/combo-box.js");
require("whatwg-fetch");
const { assert, expect, should } = require("chai");
const { createSandbox, stub, spy, mock } = require("sinon");

global.HTMLElement = window.HTMLElement;

const wait = async (milliseconds) => {
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
};

const SEARCH_RESULTS = {
  suggestions: [
    {
      "text": "Arlington, TX, USA",
      "magicKey": "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFRYLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=",
      "isCollection": false
    },
    {
      "text": "Arlington, VA, USA",
      "magicKey": "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFZBLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=",
      "isCollection": false
    },
    {
      "text": "Arlington Heights, IL, USA (Cook County)",
      "magicKey": "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24gSGVpZ2h0cywgSUwsIFVTQSAoQ29vayBDb3VudHkpI3NjPVVTQTpQUkk6VklSOkdVTTpBU00jbmVsPSNsbmc9NDAjbG49V29ybGQ=",
      "isCollection": false
    },
    {
      "text": "Arlington, MA, USA",
      "magicKey": "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIE1BLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=",
      "isCollection": false
    },
  ]
};

const SEARCH_RESULT_ITEMS = {
  "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFRYLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=": {
    "spatialReference": {
      "wkid": 4326,
      "latestWkid": 4326
    },
    "locations": [
      {
        "name": "Arlington, Texas",
        "extent": {
          "xmin": -97.23211,
          "ymin": 32.610594,
          "xmax": -96.98211,
          "ymax": 32.860594
        },
        "feature": {
          "geometry": {
            "x": -97.10711,
            "y": 32.735594
          },
          "attributes": {
            "Score": 100,
            "Addr_Type": "Locality"
          }
        }
      }
    ]
  },
  "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFZBLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=": {
    "spatialReference": {
      "wkid": 4326,
      "latestWkid": 4326
    },
    "locations": [
      {
        "name": "Arlington, Virginia",
        "extent": {
          "xmin": -77.146755,
          "ymin": 38.828763,
          "xmax": -77.022755,
          "ymax": 38.952763
        },
        "feature": {
          "geometry": {
            "x": -77.084755,
            "y": 38.890763
          },
          "attributes": {
            "Score": 100,
            "Addr_Type": "Locality"
          }
        }
      }
    ]
  },
  "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24gSGVpZ2h0cywgSUwsIFVTQSAoQ29vayBDb3VudHkpI3NjPVVTQTpQUkk6VklSOkdVTTpBU00jbmVsPSNsbmc9NDAjbG49V29ybGQ=": {
    "spatialReference": {
      "wkid": 4326,
      "latestWkid": 4326
    },
    "locations": [
      {
        "name": "Arlington Heights, Illinois",
        "extent": {
          "xmin": -88.0344577,
          "ymin": 42.0289775,
          "xmax": -87.9264577,
          "ymax": 42.1369775
        },
        "feature": {
          "geometry": {
            "x": -87.9804577,
            "y": 42.0829775
          },
          "attributes": {
            "Score": 100,
            "Addr_Type": "Locality"
          }
        }
      }
    ]
  },
  "dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIE1BLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=": {
    "spatialReference": {
      "wkid": 4326,
      "latestWkid": 4326
    },
    "locations": [
      {
        "name": "Arlington, Massachusetts",
        "extent": {
          "xmin": -71.183669,
          "ymin": 42.389249,
          "xmax": -71.129669,
          "ymax": 42.443249
        },
        "feature": {
          "geometry": {
            "x": -71.156669,
            "y": 42.416249
          },
          "attributes": {
            "Score": 100,
            "Addr_Type": "Locality"
          }
        }
      }
    ]
  }
};


global.fetch = mockFetch = url => {
  const parsedUrl = new URL(url);
  if(parsedUrl.pathname.includes("suggest")){
    return window.Promise.resolve(
      new Response(
        JSON.stringify(SEARCH_RESULTS),
        {
          status: 200,
          headers: {'Content-Type': 'application/json'}
        }
      )
    );
  } else {
    const key = parsedUrl.searchParams.get("magicKey");
    const data = SEARCH_RESULT_ITEMS[key];
    return Promise.resolve(
      new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
  }
};


describe("Combo box unit tests", () => {
  before(function(done){
    import("../../assets/js/components/combo-box.js")
      .then(() => {
        const box = window.document.createElement("wx-combo-box");
        window.document.body.append(box);
        done();
      });
  });
  beforeEach(() => {
    window.document.body.innerHTML = "";
    const box = document.querySelector("wx-combo-box");
    if(!box){
      document.body.append(
        document.createElement("wx-combo-box")
      );
    }
  });

  it("Has the element", () => {
    assert.exists(window.document.querySelector("wx-combo-box"));
    assert.exists(window.customElements.get("wx-combo-box"));
  });

  it("Element has the correct auto-generated id", () => {
    const component = document.querySelector("wx-combo-box");
    const expected = "combo-box-1";
    const actual = component.id;

    expect(expected).to.equal(actual);
  });

  describe("Input initialization", () => {
    it("Adds an input element automatically", () => {
      expect(document.querySelector("wx-combo-box > input")).to.exist;
    });
    it("Adds the correct aria-related attributes to the input", () => {
      const input = document.querySelector("wx-combo-box > input");
      const attrs = [
        ["role", "combobox"],
        ["aria-owns", "combo-box-1--list"],
        ["aria-controls", "combo-box-1--list"],
        ["aria-autocomplete", "list"],
        ["aria-activedescendant", ""],
        ["autocomplete", "off"],
        ["autocapitalize", "off"],
      ];

      attrs.forEach(pair => {
        const attr = pair[0];
        const expected = pair[1];
        const actual = input.getAttribute(attr);

        expect(actual).to.equal(expected);
      });
    });
  });

  describe("listbox initialization", () => {
    it("Adds a listbox ul automatically", () => {
      expect(document.querySelector("wx-combo-box > ul")).to.exist;
    });

    it("Adds the expected id automatically", () => {
      const expected = "combo-box-1--list";
      const actual = document.querySelector("wx-combo-box ul").id;

      expect(actual).to.equal(expected);
    });

    it("Adds the correct aria-related attributes", () => {
      const listbox = document.querySelector("wx-combo-box > ul");
      const attrs = [
        ["role", "listbox"]
      ];

      attrs.forEach(pair => {
        const attr = pair[0];
        const expected = pair[1];
        const actual = listbox.getAttribute(attr);

        expect(actual).to.equal(expected);
      });
    });
  });

  describe("Input event and search update tests", () => {

    let sandbox;
    beforeEach(function(){
      sandbox = createSandbox();
      window.document.body.innerHTML = "";
      const box = document.createElement("wx-combo-box");
      document.body.append(box);
      assert.exists(window.customElements.get("wx-combo-box"));
    });

    afterEach(function(){
      sandbox.restore();
    });

    it("Expects the component's updateSearch method to have been called on input", async () => {
      const event = new Event("input", { bubbles: true });
      const component = document.querySelector("wx-combo-box");
      const input = component.querySelector("input");
      input.focus();
      input.value = "Arlin";
      sandbox.spy(component, 'updateSearch');
      input.dispatchEvent(event);

      await wait(500);
      expect(component.updateSearch.calledOnce).to.be.true;
      expect(component.updateSearch.calledWith("Arlin")).to.be.true;
    });

    it("Expects showList to have been called when updateSearch completes", async () => {
      const event = new Event("input", { bubbles: true });
      const component = document.querySelector("wx-combo-box");
      sandbox.spy(component, 'showList');
      await component.updateSearch("Arlin");

      expect(component.showList.calledOnce).to.be.true;

    });

    it("Expects showList / hideList to toggle aria-expanded", async () => {
      const component = document.querySelector("wx-combo-box");
      component.showList();
      expect(component.getAttribute("aria-expanded")).to.equal("true");
      component.hideList();
      expect(component.getAttribute("aria-expanded")).to.equal("false");
    });
  });

  describe("List navigation tests", () => {
    let sandbox;
    beforeEach(async () => {
      sandbox = createSandbox();
      window.document.body.innerHTML = "";
      const box = document.createElement("wx-combo-box");
      document.body.append(box);
      assert.exists(window.customElements.get("wx-combo-box"));
      const responseOK = await box.updateSearch("Arlin");
      expect(responseOK).to.be.true;
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("Selects the first element in the dropdown automatically", () => {
      const component = document.querySelector("wx-combo-box");
      const listbox = component.querySelector("ul");
      const firstItem = listbox.querySelector("li:first-child");
      const actual = firstItem.getAttribute("aria-selected");

      expect(actual).to.equal("true");
    });

    it("Selects the second element in the list when the down arrow is pushed", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
      const component = document.querySelector("wx-combo-box");
      const listbox = component.querySelector("ul");
      const input = component.querySelector("input[slot='input']");
      input.focus();
      input.dispatchEvent(event);
      const selectedItemCount = listbox.querySelectorAll("li[aria-selected='true']").length;
      const secondItem = listbox.querySelector("li:nth-child(2)");
      const actual = secondItem.getAttribute("aria-selected");
      
      expect(actual).to.equal("true");
      expect(selectedItemCount).to.equal(1);
    });

    it("Hides the result list if up is pressed while on the first item", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true });
      const component = document.querySelector("wx-combo-box");
      const listbox = component.querySelector("ul");
      const input = component.querySelector("input[slot='input']");
      input.focus();

      expect(component.isShowingList).to.be.true;
      input.dispatchEvent(event);
      expect(component.isShowingList).to.be.false;
    });

    it("Does nothing when pushing down arrow when the last item is selected", () => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
      const component = document.querySelector("wx-combo-box");
      const listbox = component.querySelector("ul");
      const input = component.querySelector("input[slot='input']");
      listbox.querySelector("li[aria-selected='true']").setAttribute("aria-selected", "false");
      const lastItem = listbox.querySelector("li:last-child");
      lastItem.setAttribute("aria-selected", "true");
      input.focus();
      input.dispatchEvent(event);

      expect(component.isShowingList).to.be.true;
      expect(lastItem.getAttribute("aria-selected")).to.equal("true");
    });
  });
});
