import { expect } from "chai";
import { beforeEach, afterEach } from "mocha";
import { createSandbox } from "sinon";
import {
  getSavedLocations,
  hasSavedLocation,
  addSavedLocation,
  removeSavedLocation,
} from "../../assets/js/components/saved-locations.js";

describe("Saved locations tests", () => {
  let sandbox;
  const savedLocalStorageKey = "wxgov_saved_locations";

  const sampleData = {
    hashed: {
      "edoras, rohan": "/middle-earth/rohan/edoras/",
      "hobbiton, the shire": "/middle-earth/shire/hobbiton/",
    },
    sorted: [
      { text: "Edoras, Rohan", url: "/middle-earth/rohan/edoras/" },
      { text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/" },
    ],
  };

  beforeEach(() => {
    sandbox = createSandbox();
    global.localStorage = {
      getItem: sandbox.stub(),
      setItem: sandbox.stub(),
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getSavedLocations", () => {
    it("returns the sorted saved locations from localStorage", () => {
      global.localStorage.getItem.returns(JSON.stringify(sampleData));

      const actual = getSavedLocations();

      expect(global.localStorage.getItem.callCount).to.equal(1);
      const getItemCall = global.localStorage.getItem.getCall(0);
      expect(getItemCall.args[0]).to.equal(savedLocalStorageKey);
      expect(actual).to.deep.equal(sampleData.sorted);
    });
  });

  describe("hasSavedLocation", () => {
    it("returns true that location is in localStorage", () => {
      const loc = "Edoras, Rohan";
      global.localStorage.getItem.returns(JSON.stringify(sampleData));

      const found = hasSavedLocation(loc);

      expect(global.localStorage.getItem.callCount).to.equal(1);
      const getItemCall = global.localStorage.getItem.getCall(0);
      expect(getItemCall.args[0]).to.equal(savedLocalStorageKey);
      expect(found).to.be.true;
    });

    it("returns false that location is in localStorage", () => {
      const loc = "Dol Guldur, Mirkwood";
      global.localStorage.getItem.returns(JSON.stringify(sampleData));

      const found = hasSavedLocation(loc);

      expect(global.localStorage.getItem.callCount).to.equal(1);
      const getItemCall = global.localStorage.getItem.getCall(0);
      expect(getItemCall.args[0]).to.equal(savedLocalStorageKey);
      expect(found).to.be.false;
    });
  });

  describe("addSavedLocation", () => {
    it("adds a new saved location to localStorage", () => {
      const newLoc = {
        text: "Dol Guldur, Mirkwood",
        url: "/middle-earth/mirkwood/dol-guldur",
      };

      const expected = {
        hashed: {
          [newLoc.text.toLowerCase()]: newLoc.url,
          ...sampleData.hashed,
        },
        sorted: [newLoc, ...sampleData.sorted].sort((first, second) => {
          if (first.text.toLowerCase() < second.text.toLowerCase()) return -1;
          if (first.text.toLowerCase() > second.text.toLowerCase()) return 1;
          return 0;
        }),
      };

      global.localStorage.getItem.returns(JSON.stringify(sampleData));

      addSavedLocation(newLoc);
      expect(global.localStorage.setItem.callCount).to.equal(1);
      const setItemCall = global.localStorage.setItem.getCall(0);
      expect(setItemCall.args[0]).to.equal(savedLocalStorageKey);
      expect(JSON.parse(setItemCall.args[1])).to.deep.equal(expected);
    });

    it("does not add an existing saved location to localStorage", () => {
      const newLoc = sampleData.sorted[1];
      global.localStorage.getItem.returns(JSON.stringify(sampleData));

      addSavedLocation(newLoc);
      expect(global.localStorage.setItem.callCount).to.equal(0);
    });
  });

  describe("removeSavedLocation", () => {
    it("removes the location from saved locations in localStorage", () => {
      const removalLoc = "Edoras, Rohan";
      const modifiedSampleData = { ...sampleData };
      delete modifiedSampleData.hashed[removalLoc.toLowerCase()];
      modifiedSampleData.sorted = sampleData.sorted.filter((item) => {
        return item.text !== removalLoc;
      });

      global.localStorage.getItem.returns(JSON.stringify(sampleData));

      removeSavedLocation(removalLoc);

      expect(global.localStorage.getItem.callCount).to.equal(1);
      const setItemCall = global.localStorage.setItem.getCall(0);
      expect(setItemCall.args[0]).to.equal(savedLocalStorageKey);

      const callJson = JSON.parse(setItemCall.args[1]);
      expect(callJson).to.have.property("hashed");
      expect(callJson).to.have.property("sorted");
      expect(callJson.sorted).to.deep.equal(modifiedSampleData.sorted);
      expect(callJson.hashed).to.deep.equal(modifiedSampleData.hashed);
    });
  });
  it("does not remove the location not included from saved locations in localStorage", () => {
    const removalLoc = "Dol Guldur, Mirkwood";
    const modifiedSampleData = { ...sampleData };
    delete modifiedSampleData.hashed[removalLoc.toLowerCase()];
    modifiedSampleData.sorted = sampleData.sorted.filter((item) => {
      return item.text !== removalLoc;
    });

    global.localStorage.getItem.returns(JSON.stringify(sampleData));

    removeSavedLocation(removalLoc);

    expect(global.localStorage.getItem.callCount).to.equal(1);
    const getItemCall = global.localStorage.getItem.getCall(0);
    expect(getItemCall.args[0]).to.equal(savedLocalStorageKey);
    expect(global.localStorage.setItem.callCount).to.equal(0);
  });
});
