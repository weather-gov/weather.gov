import { expect } from "chai";
import { createSandbox } from "sinon";
import getSatelliteData from "./satellite.js";

describe("satellite metadata module", () => {
  const sandbox = createSandbox();
  const response = {
    json: sandbox.stub(),
  };

  beforeEach(() => {
    fetch.resolves(response);
  });

  describe("returns a URL if everything goes well", () => {
    it("for GOES-16 imagery", async () => {
      response.json.resolves({ meta: { satellite: "GOES-West" } });
      const actual = await getSatelliteData({ grid: { wfo: "wfo" } });

      expect(actual).to.eql({
        gif: "https://cdn.star.nesdis.noaa.gov/WFO/wfo/GEOCOLOR/GOES18-WFO-GEOCOLOR-600x600.gif",
      });
    });

    it("for GOES-18 imagery", async () => {
      response.json.resolves({ meta: { satellite: "GOES-East" } });
      const actual = await getSatelliteData({ grid: { wfo: "wfo" } });

      expect(actual).to.eql({
        gif: "https://cdn.star.nesdis.noaa.gov/WFO/wfo/GEOCOLOR/GOES16-WFO-GEOCOLOR-600x600.gif",
      });
    });
  });

  it("returns an empty object if the metadata is invalid", async () => {
    response.json.resolves({ nometa: {} });
    const actual = await getSatelliteData({ grid: { wfo: "wfo" } });

    expect(actual).to.eql({});
  });

  it("returns an empty object if the metadata fetch is unsuccessful", async () => {
    response.json.rejects(new Error("test error"));
    const actual = await getSatelliteData({ grid: { wfo: "wfo" } });

    expect(actual).to.eql({});
  });
});
