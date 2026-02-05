import { expect } from "chai";
import { before, beforeEach, afterEach } from "mocha";
import { createSandbox, stub } from "sinon";

const exampleMarkup = `
<wx-location-listbox id="listbox" tabindex="0">
<span class="listbox-group-label">Saved searches</span>
<ul role="group" class="saved-searches">
</ul>
<span class="listbox-group-label">Search results</span>
<ul role="group">
  <li role="option" data-value="dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFRYLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=">
    Arlington, TX, USA
  </li>
  <li role="option" data-value="dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFZBLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=">
    Arlington, VA, USA
  </li>
  <li role="option" data-value="dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIFZBLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=">
    Arlington Heights, IL, USA (Cook County)
  </li>
  <li role="option" data-value="dHA9NCN0dj02NjAzMDhlYyNubT1Bcmxpbmd0b24sIE1BLCBVU0Ejc2M9VVNBOlBSSTpWSVI6R1VNOkFTTSNsbmc9NDAjbG49V29ybGQ=">
    Arlington, MA, USA
  </li>
</ul>
</wx-location-listbox>
`;

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

/**
 * Let's stub out the global fetch function.
 */
const fakeFetch = async (url) => {
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

describe("Location listbox tests", () => {
  before(async () => {
    await import("../../assets/js/components/combobox/location-listbox.js");

    // We have to stub scrollIntoView, which JSDom doesn't have
    // by default
    window.HTMLElement.prototype.scrollIntoView = () => {};
  });

  beforeEach(() => {
    document.body.innerHTML = exampleMarkup;

    // Make sure the globally stubbed fetch calls our
    // fake fetch function
    global.fetch.callsFake(fakeFetch);
  });

  it("the component is registered", () => {
    expect(window.customElements.get("wx-location-listbox")).to.exist;
  });

  describe("Saved search functionality", () => {
    let sandbox;
    beforeEach(() => {
      sandbox = createSandbox();
      window.history.replaceState(null, null, "http://localhost/");
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("calls #saveSearchResult if the place data attribute is set on the element", () => {
      const newMarkup = `<wx-location-listbox id="listbox" data-place="Narnia, Closet"></wx-location-listbox>`;
      document.body.innerHTML = newMarkup;
      const listbox = document.getElementById("listbox");

      // Take the element out of the DOM.
      // We add the spy, then re-add it to the dom.
      // This way, the connectedCallback will be triggered again
      // and we can spy on the expected behavior at attachment time
      listbox.remove();
      const saveSpy = sandbox.spy(listbox, "saveSearchResult");
      document.body.append(listbox);

      expect(listbox.dataset.place).to.exist;
      expect(saveSpy.callCount).to.equal(1);

      const spyCall = saveSpy.getCall(0);
      expect(spyCall.args[0]).to.eql({
        text: "Narnia, Closet",
        url: "/"
      });

      
    });
  });

  describe("Method tests", () => {
    let sandbox;
    beforeEach(() => {
      sandbox = createSandbox();
      global.localStorage = {
        getItem: sandbox.stub(),
        setItem: sandbox.stub()
      };
    });

    afterEach(() => {
      sandbox.restore();
    });
    describe("#updateSavedSearches", () => {
      it("adds the saved search item to the saved searches group", () => {
        global.localStorage.getItem.returns(
          JSON.stringify([{
            text: "Narnia, Closet",
            url: "/the/way/to/narnia/"
          }])
        );
        const listbox = document.getElementById("listbox");

        listbox.updateSavedSearches();

        const savedItem = listbox.querySelector(`[data-url="/the/way/to/narnia/"]`);
        expect(global.localStorage.getItem.callCount).to.equal(1);
        expect(savedItem).to.exist;
        expect(savedItem.textContent).to.equal("Narnia, Closet");
      });

      it("makes the saved searches list empty if there are no saved items", () => {
        global.localStorage.getItem.returns(undefined);
        const listbox = document.getElementById("listbox");

        listbox.updateSavedSearches();

        const savedItemElements = listbox.querySelectorAll(`[slot="saved-searches"] > [role="option"]`);
        expect(savedItemElements.length).to.equal(0);
      });
    });

    describe("#saveSearchResult", () => {
      let sandbox;
      beforeEach(() => {
        sandbox = createSandbox();
        global.localStorage = {
          getItem: sandbox.stub(),
          setItem: sandbox.stub()
        };
      });

      afterEach(() => {
        sandbox.restore();
      });

      it("saves the object to localStorage when there are no other saved items", () => {
        const listbox = document.getElementById("listbox");
        const example = { text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/"};
        const expected = JSON.stringify([example]);

        listbox.saveSearchResult(example);

        expect(global.localStorage.setItem.callCount).to.equal(1);
        const setCall = global.localStorage.setItem.getCall(0);
        expect(setCall.args[1]).to.equal(expected);
        expect(setCall.args[0]).to.equal("wxgov_recent_locations");
      });

      it("appends the object to exiting list in localStorage, when there are already saved items", () => {
        const listbox = document.getElementById("listbox");
        const existingItems = [
          {text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/"}
        ];
        global.localStorage.getItem.returns(JSON.stringify(existingItems));
        const newItem = { text: "Edoras, Rohan", url: "/middle-earth/rohan/edoras/"};
        const expected = JSON.stringify(
          [
            existingItems[0],
            newItem
          ]
        );

        listbox.saveSearchResult(newItem);

        expect(global.localStorage.setItem.callCount).to.equal(1);
        const setItemCall = global.localStorage.setItem.getCall(0);
        expect(setItemCall.args[0]).to.equal("wxgov_recent_locations");
        expect(setItemCall.args[1]).to.equal(expected);
      });
    });

    describe("#cacheLocationGeodata", () => {
      let sandbox;
      beforeEach(() => {
        sandbox = createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
        window.sessionStorage.clear();
      });

      it("does not make a location data request if the item is already cached", async () => {
        const listbox = document.getElementById("listbox");
        const getSpy = sandbox.spy(listbox, "getLocationGeodata");
        window.sessionStorage.setItem("some-magic-key", "true");
        
        await listbox.cacheLocationGeodata("some-magic-key");

        // We expect that getLocationGeodata is never called,
        // because the magicKey exists in the cache already
        expect(getSpy.callCount).to.equal(0);
      });

      it("calls getLocationGeodata when the magicKey isn't already in the cache", async () => {
        const listbox = document.getElementById("listbox");
        const resultItem = { ok: true };
        const getLocationDataStub = sandbox.stub(listbox, "getLocationGeodata");
        getLocationDataStub.resolves(resultItem);

        expect(window.sessionStorage.getItem("some-magic-key")).to.not.exist;
        await listbox.cacheLocationGeodata("some-magic-key");
        expect(window.sessionStorage.getItem("some-magic-key")).to.exist;

        expect(getLocationDataStub.callCount).to.equal(1);
      });
    });

    describe("#getGeodataForKey", () => {
      let sandbox;
      beforeEach(() => {
        sandbox = createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
        window.sessionStorage.clear();
      });

      it("returns the cached value, if there is one", async () => {
        const listbox = document.getElementById("listbox");
        const item = {ok: true};
        const getLocationGeodataStub = sandbox.stub(listbox, "getLocationGeodata");
        window.sessionStorage.setItem("some-magic-key", JSON.stringify(item));

        const result = await listbox.getGeodataForKey("some-magic-key");

        expect(getLocationGeodataStub.callCount).to.equal(0);
        expect(result).to.eql(item);
      });

      it("fetches the value remotely if there is not a cached value for the key", async () => {
        const listbox = document.getElementById("listbox");
        const item = {ok: true};
        const getLocationGeodataStub = sandbox.stub(listbox, "getLocationGeodata");
        getLocationGeodataStub.resolves(item);

        const result = await listbox.getGeodataForKey("some-magic-key");

        expect(getLocationGeodataStub.callCount).to.equal(1);
        expect(result).to.eql(item);
      });
    });

    describe("#getLocationGeodata", () => {
      let sandbox;
      beforeEach(() => {
        sandbox = createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
      });

      it("returns the expected response", async () => {
        const listbox = document.getElementById("listbox");
        const processDataSpy = sandbox.spy(listbox, "processLocationGeodata");
        const resultItemKey = Object.keys(SEARCH_RESULT_ITEMS)[2];
        const resultItem = { "lat": 42.083, "lon": -87.98 };

        const result = await listbox.getLocationGeodata(resultItemKey);

        expect(processDataSpy.callCount).to.equal(1);
        expect(result).to.eql(resultItem);
      });
    });

    describe("#getSearchResults", () => {
      beforeEach(() => {
        global.fetch.restore();
        stub(global, "fetch");
      });
      afterEach(() => {
        global.fetch.restore();
        stub(global, "fetch").callsFake(fakeFetch);
      });
      
      it("returns an object with an empty suggestions list if the response is not ok", async () => {
        fetch.resolves({ok: false});
        const listbox = document.getElementById("listbox");

        const results = await listbox.getSearchResults("a");

        expect(fetch.callCount).to.equal(1);
        expect(results).to.eql({suggestions: []});
      });
    });
  });

  describe("Misc tests", () => {
    let sandbox;
    beforeEach(() => {
      sandbox = createSandbox();
    });

    afterEach(() => {
      sandbox.restore();
    });
    
    it("when a nav event is triggered, we fire off a cache request on the item asynchronously", async () => {
      const listbox = document.getElementById("listbox");
      listbox.focus();
      const cacheLocationSpy = sandbox.stub(listbox, "cacheLocationGeodata");
      const secondSearchItemKey = SEARCH_RESULTS.suggestions[1].magicKey;
      const secondItemElement = listbox.querySelector(`[role="option"][data-value="${secondSearchItemKey}"]`);
      listbox.pseudoFocusItem(secondItemElement);
      expect(secondItemElement).to.exist;
      expect(cacheLocationSpy.callCount).to.equal(0);

      listbox.moveDown();

      expect(cacheLocationSpy.callCount).to.equal(1);      
    });
  });
});
