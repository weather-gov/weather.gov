import { expect } from "chai";
import { before, beforeEach, afterEach } from "mocha";
import { createSandbox } from "sinon";

const testingLocation = {
  text: "Bad Lands, AQ",
  url: "/bad-lands/alpha-quadrant",
};
const testingMarkupFront = `
<wx-saved-locations-section data-type=front data-mode="dark">
  <section id="saved-locations-section-front" class="padding-y-3">
    <div class="grid-container">
      <div class="grid-row">
        <h2 class="margin-y-2">Saved locations</h2>
      </div>
      <div class="grid-row">
        <div class="saved-locations-list">
          <ul class="usa-list usa-list--unstyled font-body-md">
            
          </ul>
        </div>
      </div>
    </div>
  </section>
  <template id="saved-locations-section-front-li">
    <li class="display-flex flex-align-center">
      <button 
        id="saved-locations-section-btn-" 
        type="button" 
        role="switch" aria-checked="true"
        class="bg-transparent saved-locations-button saved-locations-button-mode--dark cursor-pointer border-0 padding-105 margin-right-05 margin-left-neg-1"
      >
        <svg class="usa-icon saved-locations-icon height-205 width-205" aria-hidden"false" role="img">
            <title class="usa-sr-only">Saved locations</title>
            <use xlink:href="/public/images/uswds/sprite.svg#star"></use>
        </svg>
      </button>
      <span>
        <a class="saved-locations-item text-normal"></a>
      </span>
    </li>
  </template>
</wx-saved-locations-section>
`;

const testingMarkupNav = `
<wx-saved-locations-section data-type="nav" data-mode="light" data-columns="false">
  <section id="saved-locations-section-nav">
    <div class="grid-container">
      <div class="grid-row">
        <span class="font-body-xs">Saved Locations</span>
      </div>
      <div class="grid-row">
        <div class="saved-locations-list">
          <ul class="usa-list usa-list--unstyled font-body-xs">
            
          </ul>
        </div>
      </div>
    </div>
  </section>
  <template id="saved-locations-section-nav-li">
  <li class="display-flex flex-align-center">
  <button 
  id="saved-locations-section-btn-" 
  type="button" 
  role="switch" aria-checked="true"
  class="bg-transparent saved-locations-button saved-locations-button-mode--light cursor-pointer border-0 padding-105 margin-right-05 margin-left-neg-1"
  >
  <svg class="usa-icon saved-locations-icon height-205 width-205" aria-hidden"false" role="img">
  <title class="usa-sr-only">Saved location</title>
  <use xlink:href="/public/images/uswds/sprite.svg#star"></use>
  </svg>
  </button>
  <span>
  <a class="saved-locations-item text-normal"></a>
  </span>
  </li>
  </template>
</wx-saved-locations-section>
`;

const testStorageUnsaved = {
  hashed: {
    "edoras, rohan": "/middle-earth/rohan/edoras/",
    "hobbiton, the shire": "/middle-earth/shire/hobbiton/",
  },
  sorted: [
    { text: "Edoras, Rohan", url: "/middle-earth/rohan/edoras/" },
    { text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/" },
  ],
};

const testStorageSaved = {
  hashed: {
    "bad lands, aq": "/bad-lands/alpha-quadrant/",
    "edoras, rohan": "/middle-earth/rohan/edoras/",
    "hobbiton, the shire": "/middle-earth/shire/hobbiton/",
  },
  sorted: [
    { text: "Bad Lands, AQ", url: "/bad-lands/alpha-quadrant/" },
    { text: "Edoras, Rohan", url: "/middle-earth/rohan/edoras/" },
    { text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/" },
  ],
};

const testStorageTwoColumn = {
  hashed: {
    "bad lands, aq": "/alpha-quadrant/bad-lands/",
    "bajor-b'hava'el, aq": "/alpha-quadrant/bajor-bhavael/",
    "cardassia prime, aq": "/alpha-quadrant/cardassia-prime/",
    "edoras, rohan": "/middle-earth/rohan/edoras/",
    "enora prime, dq": "/delta-quadrant/cardassia-prime/",
    "hobbiton, the shire": "/middle-earth/shire/hobbiton/",
    "majalis, aq": "/alpha-quadrant/majalis/",
    "ni'var, bq": "/beta-quadrant/nivar/",
    "pahvo, bq": "/beta-quadrant/pahvo/",
  },
  sorted: [
    { text: "Bad Lands, AQ", url: "/alpha-quadrant/bad-lands/" },
    { text: "Bajor-B'Hava'el, AQ", url: "/alpha-quadrant/bajor-bhavael/" },
    { text: "Cardassia Prime, AQ", url: "/alpha-quadrant/cardassia-prime/" },
    { text: "Edoras, Rohan", url: "/middle-earth/rohan/edoras/" },
    { text: "Enora Prime, DQ", url: "/delta-quadrant/cardassia-prime/" },
    { text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/" },
    { text: "Majalis, AQ", url: "/alpha-quadrant/majalis/" },
    { text: "Ni'Var, BQ", url: "/alpha-quadrant/nivar/" },
    { text: "Pahvo, BQ", url: "/beta-quadrant/pahvo/" },
  ],
};
const hiddenClass = "display-none";

describe("Saved locations section tests", () => {
  let sandbox;
  before(async () => {
    await import("../../assets/js/components/saved-locations-section.js");
  });

  beforeEach(() => {
    document.body.innerHTML = testingMarkupFront;
    sandbox = createSandbox();
    global.localStorage = {
      getItem: sandbox.stub(),
      setItem: sandbox.stub(),
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("the component is registered", () => {
    expect(window.customElements.get("wx-saved-locations-section")).to.exist;
  });

  describe("Initial display class setting", () => {
    it("sets the correct class for display if list is present", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkupFront;
      const section = document.getElementsByTagName("section");
      expect(section[0].classList.contains(hiddenClass)).to.be.false;
    });

    it("sets the correct class for hidden if list is empty", () => {
      global.localStorage.getItem.returns(
        JSON.stringify({ hashed: {}, sorted: [] }),
      );
      document.body.innerHTML = testingMarkupFront;
      const section = document.getElementsByTagName("section");
      expect(section[0].classList.contains(hiddenClass)).to.be.true;
    });

    it("sets the correct class for display if list is present - nav", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkupNav;
      const section = document.getElementsByTagName("section");
      expect(section[0].classList.contains(hiddenClass)).to.be.false;
    });

    it("sets the correct class for hidden if list is empty - nav", () => {
      global.localStorage.getItem.returns(
        JSON.stringify({ hashed: {}, sorted: [] }),
      );
      document.body.innerHTML = testingMarkupNav;
      const section = document.getElementsByTagName("section");
      expect(section[0].classList.contains(hiddenClass)).to.be.true;
    });
  });

  describe("Button click handling", () => {
    it("handles button click saved to unsaved toggle", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal("true");
      locationsButtons[0].click();
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal(
        "false",
      );
    });

    it("handles click saved to unsaved to saved toggle", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      locationsButtons[0].click();
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal(
        "false",
      );
      locationsButtons[0].click();
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal("true");
    });
  });

  describe("Window event: wx-saved-locations:button", () => {
    it("handles window event button-add when currently unsaved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons.length).to.equal(
        testStorageUnsaved.sorted.length,
      );
      // Return the new storage as though the location was added
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
    });

    it("handles window event button-add when currently saved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
      // Return the new storage as though the location was added
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
    });

    it("handles window event button-remove when currently saved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
      // Return the new storage as though the location was added
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-remove", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
      const unsavedButtons = document.querySelectorAll(
        `[aria-checked="false"]`,
      );
      expect(unsavedButtons.length).to.equal(1);
    });

    it("handles window event button-remove when currently unsaved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons.length).to.equal(
        testStorageUnsaved.sorted.length,
      );
      // Return the new storage as though the location was added
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-remove", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );
      expect(locationsButtons.length).to.equal(
        testStorageUnsaved.sorted.length,
      );
    });
  });

  describe("Window event: wx-saved-locations:section", () => {
    it("handles window event section-add when currently unsaved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
      // Now set the first button to unsaved
      locationsButtons[0].click();
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal(
        "false",
      );
      // Return the new storage as though the location was added
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
            caller: "nav", // Set to nav to emulate another section toggling their button
          },
        }),
      );
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal("true");
    });

    it("handles window event section-add when currently saved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal("true");
      // Return the new storage as though the location was added
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
            caller: "nav", // Set to nav to emulate another section toggling their button
          },
        }),
      );
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal("true");
    });

    it("handles window event section-remove when currently saved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal("true");
      // Return the new storage as though the location was added
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-remove", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
            caller: "nav", // Set to nav to emulate another section toggling their button
          },
        }),
      );
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal(
        "false",
      );
    });

    it("handles window event section-remove when currently unsaved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkupFront;
      const locationsButtons = document.getElementsByTagName("button");
      expect(locationsButtons.length).to.equal(testStorageSaved.sorted.length);
      // Now set the first button to unsaved
      locationsButtons[0].click();
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal(
        "false",
      );
      // Return the new storage as though the location was added
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-remove", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
            caller: "nav", // Set to nav to emulate another section toggling their button
          },
        }),
      );
      expect(locationsButtons[0].getAttribute("aria-checked")).to.equal(
        "false",
      );
    });
  });

  describe("Update classes based on state", () => {
    it("handles hidden to display when adding first saved location", () => {
      global.localStorage.getItem.returns(
        JSON.stringify({ hashed: {}, sorted: [] }),
      );
      document.body.innerHTML = testingMarkupFront;
      const section = document.getElementsByTagName("section");
      expect(section[0].classList.contains(hiddenClass)).to.be.true;
      // Add a new item
      global.localStorage.getItem.returns(
        JSON.stringify({
          hashed: { "bad lands, aq": "/alpha-quadrant/bad-lands/" },
          sorted: [
            { text: "Bad Lands, AQ", url: "/alpha-quadrant/bad-lands/" },
          ],
        }),
      );
      // Send even for adding the new item
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );

      expect(section[0].classList.contains(hiddenClass)).to.be.false;
    });

    it("handles column increase", () => {
      const truncatedTestStorage = testStorageTwoColumn;
      delete truncatedTestStorage[testingLocation.text.toLowerCase()];
      truncatedTestStorage.sorted.shift();

      global.localStorage.getItem.returns(JSON.stringify(truncatedTestStorage));
      document.body.innerHTML = testingMarkupFront;
      const listUl = document.getElementsByTagName("ul");
      expect(listUl[0].classList.contains("use-columns--x2")).to.be.false;

      // Add a new item
      global.localStorage.getItem.returns(
        JSON.stringify({
          hashed: { "bad lands, aq": "/alpha-quadrant/bad-lands/" },
          sorted: [
            { text: "Bad Lands, AQ", url: "/alpha-quadrant/bad-lands/" },
          ],
        }),
      );
      // Send even for adding the new item
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );

      expect(listUl[0].classList.contains("use-columns--x2")).to.be.true;
    });

    it("nav does not handle column increase", () => {
      const truncatedTestStorage = testStorageTwoColumn;
      delete truncatedTestStorage[testingLocation.text.toLowerCase()];
      truncatedTestStorage.sorted.shift();

      global.localStorage.getItem.returns(JSON.stringify(truncatedTestStorage));
      document.body.innerHTML = testingMarkupNav;
      const listUl = document.getElementsByTagName("ul");
      expect(listUl[0].classList.contains("use-columns--x2")).to.be.false;

      // Add a new item
      global.localStorage.getItem.returns(
        JSON.stringify({
          hashed: { "bad lands, aq": "/alpha-quadrant/bad-lands/" },
          sorted: [
            { text: "Bad Lands, AQ", url: "/alpha-quadrant/bad-lands/" },
          ],
        }),
      );
      // Send even for adding the new item
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:button-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );

      expect(listUl[0].classList.contains("use-columns--x2")).to.be.false;
    });
  });
});
