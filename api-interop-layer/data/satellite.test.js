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

  describe("returns data if everything goes well", () => {
    it("for GOES-18 imagery", async () => {
      response.json.resolves({
        meta: {
          satellite: "GOES-West",
        },
      });
      const actual = await getSatelliteData({
        grid: { wfo: "wfo1" },
        place: { timezone: "America/Los_Angeles" },
      });

      expect(actual).to.include({
        latest: "https://cdn.star.nesdis.noaa.gov/WFO/wfo1/GEOCOLOR/latest.jpg",
        gif: "https://cdn.star.nesdis.noaa.gov/WFO/wfo1/GEOCOLOR/GOES18-WFO1-GEOCOLOR-600x600.gif",
        mp4: "https://cdn.star.nesdis.noaa.gov/WFO/wfo1/GEOCOLOR/GOES18-WFO1-GEOCOLOR-600x600.mp4",
      });
    });

    it("for GOES-19 imagery", async () => {
      response.json.resolves({
        meta: {
          satellite: "GOES-East",
        },
      });
      const actual = await getSatelliteData({
        grid: { wfo: "wfo2" },
        place: { timezone: "America/New_York" },
      });

      expect(actual).to.include({
        latest: "https://cdn.star.nesdis.noaa.gov/WFO/wfo2/GEOCOLOR/latest.jpg",
        gif: "https://cdn.star.nesdis.noaa.gov/WFO/wfo2/GEOCOLOR/GOES19-WFO2-GEOCOLOR-600x600.gif",
        mp4: "https://cdn.star.nesdis.noaa.gov/WFO/wfo2/GEOCOLOR/GOES19-WFO2-GEOCOLOR-600x600.mp4",
      });
    });

    it("correctly sets timestamps with proper UTC offset", async () => {
      response.json.resolves({
        meta: {
          satellite: "GOES-East",
          // The first flood warning issued by the Weather Bureau.
          observation_time: "1891-01-24T12:00:00Z",
        },
      });
      const actual = await getSatelliteData({
        grid: { wfo: "wfo2" },
        place: { timezone: "America/Los_Angeles" },
      });

      expect(actual.times).to.include({
        start: "1891-01-23T20:00:00-08:00",
        end: "1891-01-24T04:00:00-08:00",
      });
    });
  });

  it("returns an error object if the metadata is invalid", async () => {
    response.json.resolves({ nometa: {} });
    const actual = await getSatelliteData({
      grid: { wfo: "wfo3" },
      place: { timezone: "America/New_York" },
    });

    expect(actual).to.eql({ error: true });
  });

  it("returns an error object if the metadata fetch is unsuccessful", async () => {
    response.status = 404;
    const actual = await getSatelliteData({
      grid: { wfo: "wfo4" },
      place: { timezone: "America/New_York" },
    });

    expect(actual).to.eql({ error: true });
  });
});
