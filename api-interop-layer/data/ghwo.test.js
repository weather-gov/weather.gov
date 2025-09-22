import { mock } from "node:test";
import { expect } from "chai";
import { getGHWOForWFOAndCounty } from "./ghwo.js";

describe("GHWO risks and images", () => {
  const mockFetch = ({ status = 200, data = null } = {}) => {
    mock.method(global, "fetch", async () => ({
      status,
      json: async () => data,
    }));
  };

  afterEach(() => {
    mock.reset();
  });

  describe("it passes along HTTP error statuses", () => {
    it("400", async () => {
      mockFetch({ status: 400 });
      const out = await getGHWOForWFOAndCounty("ABC", "11111");

      expect(out).to.eql({
        status: 400,
        error: "Could not retrieve GHWO for ABC",
      });
    });

    it("404", async () => {
      mockFetch({ status: 404 });
      const out = await getGHWOForWFOAndCounty("DEF", "11111");

      expect(out).to.eql({
        status: 404,
        error: "Could not retrieve GHWO for DEF",
      });
    });

    it("500", async () => {
      mockFetch({ status: 500 });
      const out = await getGHWOForWFOAndCounty("GHI", "11111");

      expect(out).to.eql({
        status: 500,
        error: "Could not retrieve GHWO for GHI",
      });
    });
  });

  it("returns a 404 if the county is not returned by the WFO", async () => {
    mockFetch({ data: { 11111: {}, 22222: {} } });
    const out = await getGHWOForWFOAndCounty("ABC", "33333");

    expect(out).to.eql({
      status: 404,
      error: "Could not retrieve GHWO for county 33333 from ABC",
    });
  });

  it("returns GHWO data", async () => {
    mockFetch({
      data: {
        counties: {
          12345: {
            "1970-01-01T00:00:00-00:00": {
              ConvectiveWind: 3,
              FakeOne: 1,
            },
            "1970-01-02T00:00:00-00:00": {
              FakeTwo: 2,
              "Frost/Freeze": "passthrough",
              DailyComposite: false,
            },
            "1970-01-03T00:00:00-00:00": {
              Day3: 3,
              Day4: 4,
            },
          },
        },
      },
    });

    const out = await getGHWOForWFOAndCounty("AAA", "12345");
    expect(out).to.eql({
      data: {
        days: [
          {
            timestamp: "1970-01-01T00:00:00-00:00",
            dayNumber: 1,
            ConvectiveWind: 3,
            FakeOne: 1,
            images: {
              // Validates that the "ConvectiveWind" element is translated to
              // "ThunderstormWind" for image URLs. Also validates that the
              // day number is appended correctly.
              ConvectiveWind:
                "https://www.weather.gov/images/aaa/ghwo/ThunderstormWindDay1.jpg",
              // Validates that keys without mappings are passed through.
              FakeOne:
                "https://www.weather.gov/images/aaa/ghwo/FakeOneDay1.jpg",
            },
          },
          {
            timestamp: "1970-01-02T00:00:00-00:00",
            dayNumber: 2,
            FakeTwo: 2,
            "Frost/Freeze": "passthrough",
            // Validates that DailyComposite doesn't pull in an image
            DailyComposite: false,
            images: {
              FakeTwo:
                "https://www.weather.gov/images/aaa/ghwo/FakeTwoDay2.jpg",
              "Frost/Freeze":
                "https://www.weather.gov/images/aaa/ghwo/FrostFreezeDay2.jpg",
            },
          },
          {
            timestamp: "1970-01-03T00:00:00-00:00",
            dayNumber: 3,
            Day3: 3,
            Day4: 4,
            images: {
              Day3: "https://www.weather.gov/images/aaa/ghwo/Day3Day3.jpg",
              Day4: "https://www.weather.gov/images/aaa/ghwo/Day4Day3.jpg",
            },
          },
        ],
      },
    });
  });
});
