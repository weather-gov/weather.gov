import { expect } from "chai";
import { createSandbox } from "sinon";
import getSatelliteData from "./satellite.js";

describe("satellite metadata module", () => {
  const sandbox = createSandbox();
  const response = {
    status: 200,
    json: sandbox.stub(),
  };

  beforeEach(() => {
    response.status = 200;
    fetch.resolves(response);
  });

  describe("returns a URL if everything goes well", () => {
    it("for GOES-16 imagery", async () => {
      response.json.resolves({ meta: { satellite: "GOES-West" } });
      const actual = await getSatelliteData({ grid: { wfo: "wfo1" } });

      expect(actual).to.eql({
        gif: "https://cdn.star.nesdis.noaa.gov/WFO/wfo1/GEOCOLOR/GOES18-WFO1-GEOCOLOR-600x600.gif",
      });
    });

    it("for GOES-18 imagery", async () => {
      response.json.resolves({ meta: { satellite: "GOES-East" } });
      const actual = await getSatelliteData({ grid: { wfo: "wfo2" } });

      expect(actual).to.eql({
        gif: "https://cdn.star.nesdis.noaa.gov/WFO/wfo2/GEOCOLOR/GOES16-WFO2-GEOCOLOR-600x600.gif",
      });
    });
  });

  it("returns an error object if the metadata is invalid", async () => {
    response.json.resolves({ nometa: {} });
    const actual = await getSatelliteData({ grid: { wfo: "wfo3" } });

    expect(actual).to.eql({ error: true });
  });

  it("returns an error object if the metadata fetch is unsuccessful", async () => {
    response.status = 404;
    const actual = await getSatelliteData({ grid: { wfo: "wfo4" } });

    expect(actual).to.eql({ error: true });
  });
});
