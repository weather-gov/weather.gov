import { expect } from "chai";
import { before, beforeEach, afterEach } from "mocha";
import { createSandbox } from "sinon";

const testingLocation = {
  text: "Bad Lands, AQ",
  url: "/bad-lands/alpha-quadrant",
};
const testingMarkup = `
<wx-saved-locations-button data-place="${testingLocation.text}" data-url="${testingLocation.url}">
  <button is="wx-saved-locations-button"
    aria-checked="true"
    type="button"
    class="bg-transparent saved-locations-button-mode--dark cursor-pointer border-0">
    <svg class="usa-icon saved-locations-icon padding-1 height-4 width-4"
        aria-hidden="true"
        role="img">
      <use xlink:href="/public/images/uswds/sprite.svg#star"></use>
    </svg>
  </button>
</<wx-saved-locations-button>
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
    "bad lands, aq": "/bad-lands/alpha-quadrant",
    "edoras, rohan": "/middle-earth/rohan/edoras/",
    "hobbiton, the shire": "/middle-earth/shire/hobbiton/",
  },
  sorted: [
    { text: "Bad Lands, AQ", url: "/bad-lands/alpha-quadrant" },
    { text: "Edoras, Rohan", url: "/middle-earth/rohan/edoras/" },
    { text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/" },
  ],
};

describe("Saved locations button tests", () => {
  let sandbox;
  before(async () => {
    await import("../../assets/js/components/saved-locations-button.js");
  });

  beforeEach(() => {
    document.body.innerHTML = testingMarkup;
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
    expect(window.customElements.get("wx-saved-locations-button")).to.exist;
  });

  describe("Class setting", () => {
    it("sets the correct class for unsaved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkup;
      const savedButton = document.getElementsByTagName("button");
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("false");
    });

    it("sets the correct class for saved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkup;
      const savedButton = document.getElementsByTagName("button");
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("true");
    });
  });

  describe("Button click handling", () => {
    it("handles click unsaved to saved toggle", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkup;
      const savedButton = document.getElementsByTagName("button");
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("false");
      savedButton[0].click();
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("true");
    });

    it("handles click saved to unsaved toggle", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkup;
      const savedButton = document.getElementsByTagName("button");
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("true");
      savedButton[0].click();
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("false");
    });
  });

  describe("Window event: wx-saved-locations:section", () => {
    it("handles window event section-add when currently unsaved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkup;
      const savedButton = document.getElementsByTagName("button");
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("false");
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("true");
    });

    it("handles window event section-add when currently saved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkup;
      const savedButton = document.getElementsByTagName("button");
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("true");
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-add", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("true");
    });

    it("handles window event section-remove when currently saved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageSaved));
      document.body.innerHTML = testingMarkup;
      const savedButton = document.getElementsByTagName("button");
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("true");
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-remove", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("false");
    });
    it("handles window event section-remove when currently unsaved", () => {
      global.localStorage.getItem.returns(JSON.stringify(testStorageUnsaved));
      document.body.innerHTML = testingMarkup;
      const savedButton = document.getElementsByTagName("button");
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("false");
      window.dispatchEvent(
        new CustomEvent("wx-saved-locations:section-remove", {
          detail: {
            text: testingLocation.text,
            url: testingLocation.url,
          },
        }),
      );
      expect(savedButton[0].getAttribute("aria-checked")).to.equal("false");
    });
  });
});
