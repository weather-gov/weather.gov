import { expect } from "chai";
import { beforeEach, afterEach } from "mocha";
import { createSandbox } from "sinon";
import { getSavedLocations, addSavedLocation } from "../../assets/js/components/saved-locations.js";

describe("Saved locations tests", () => {
  // before(async () => {
  //   await import("../../assets/js/components/saved-locations.js");
  // });
  
  describe("getSavedLocations", () => {
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

    it("returns the locations from localStorage", () => {
      const expected = [
        { text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/" },
        { text: "Edoras, Rohan", url: "/middle-earth/rohan/edoras/" }
      ];
      global.localStorage.getItem.returns(JSON.stringify(expected));

      const actual = getSavedLocations();

      expect(global.localStorage.getItem.callCount).to.equal(1);
      const getItemCall = global.localStorage.getItem.getCall(0);
      expect(getItemCall.args[0]).to.equal("wxgov_recent_locations");
      expect(actual).to.deep.equal(expected);
    });

    it("returns the point locations adding '/forecast' if needed", () => {
      const stored = [
        { text: "Hobbiton, The Shire", url: "/point/-38/176" },
        { text: "Edoras, Rohan", url: "/point/-44/170" }
      ];
      global.localStorage.getItem.returns(JSON.stringify(stored));

      const actual = getSavedLocations();

      expect(global.localStorage.getItem.callCount).to.equal(1);
      const getItemCall = global.localStorage.getItem.getCall(0);
      expect(getItemCall.args[0]).to.equal("wxgov_recent_locations");
      expect(actual[0].text).to.equal(stored[0].text);
      expect(actual[0].url).to.equal("/forecast/point/-38/176");
      expect(actual[1].text).to.equal(stored[1].text);
      expect(actual[1].url).to.equal("/forecast/point/-44/170");
    });

    it("returns the point locations without adding forecast if present", () => {
      const stored = [
        { text: "Hobbiton, The Shire", url: "/forecast/point/-38/176" },
        { text: "Edoras, Rohan", url: "/forecast/point/-44/170" }
      ];
      global.localStorage.getItem.returns(JSON.stringify(stored));

      const actual = getSavedLocations();

      expect(global.localStorage.getItem.callCount).to.equal(1);
      const getItemCall = global.localStorage.getItem.getCall(0);
      expect(getItemCall.args[0]).to.equal("wxgov_recent_locations");
      expect(actual[0].text).to.equal(stored[0].text);
      expect(actual[0].url).to.equal("/forecast/point/-38/176");
      expect(actual[1].text).to.equal(stored[1].text);
      expect(actual[1].url).to.equal("/forecast/point/-44/170");
    });
  });

  describe("addSavedLocation", () => {
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

    it("saves the location to localStorage when there are no other saved items", () => {
      const example = { text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/"};
      const expected = JSON.stringify([example]);

      addSavedLocation(example);

      expect(global.localStorage.setItem.callCount).to.equal(1);
      const setCall = global.localStorage.setItem.getCall(0);
      expect(setCall.args[1]).to.equal(expected);
      expect(setCall.args[0]).to.equal("wxgov_recent_locations");
    });

    it("prepends the location to exiting list in localStorage, when there are already saved items", () => {
      const existingItems = [
        {text: "Hobbiton, The Shire", url: "/middle-earth/shire/hobbiton/"}
      ];
      global.localStorage.getItem.returns(JSON.stringify(existingItems));
      const newItem = { text: "Edoras, Rohan", url: "/middle-earth/rohan/edoras/"};
      const expected = JSON.stringify([ newItem, ...existingItems ]);

      addSavedLocation(newItem);

      expect(global.localStorage.setItem.callCount).to.equal(1);
      const setItemCall = global.localStorage.setItem.getCall(0);
      expect(setItemCall.args[0]).to.equal("wxgov_recent_locations");
      expect(setItemCall.args[1]).to.equal(expected);
    });
  });
});
