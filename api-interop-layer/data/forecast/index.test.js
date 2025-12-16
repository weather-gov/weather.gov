import sinon from "sinon";
import { expect } from "chai";
import dayjs from "../../util/day.js";
import forecast from "./index.js";

const place = {
  timezone: "America/Los_Angeles",
};

const url = (path) =>
  new URL(path, process.env.API_URL ?? "https://api.weather.gov").toString();

describe("Forecast index", () => {
  const sandbox = sinon.createSandbox();

  before(async () => {});

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  describe("for a land point", () => {
    it("calls the expected endpoints", async () => {
      await forecast({
        grid: { wfo: "TST", x: 49488, y: 34 },
        place,
        isMarine: false,
      });

      expect(fetch.calledWith(url`/gridpoints/TST/49488,34`)).to.be.true;
      expect(fetch.calledWith(url`/gridpoints/TST/49488,34/forecast`)).to.be
        .true;
      expect(fetch.calledWith(url`/gridpoints/TST/49488,34/forecast/hourly`)).to
        .be.true;
    });
  });

  describe("for a marine point", () => {
    it("calls the expected API endpoints", async () => {
      await forecast({
        grid: { wfo: "TST", x: 49488, y: 34 },
        place,
        isMarine: true,
      });

      expect(fetch.calledWith(url`/gridpoints/TST/49488,34`)).to.be.true;

      // These two should ***NOT*** be called for a marine point.
      expect(fetch.calledWith(url`/gridpoints/TST/49488,34/forecast`)).to.be
        .false;
      expect(fetch.calledWith(url`/gridpoints/TST/49488,34/forecast/hourly`)).to
        .be.false;
    });

    describe("with valid data", () => {
      let clock;
      const response = { status: 200, json: sinon.stub() };

      let gridpoint;

      before(() => {
        clock = sinon.useFakeTimers({ now: 0 });
      });

      beforeEach(() => {
        clock.reset();
        fetch.resolves(response);

        gridpoint = {
          geometry: "ball",
          properties: {
            temperature: {
              uom: "wmoUnit:degC",
              values: [{ validTime: "1990-03-03T04:00:00Z/PT3H", value: 3 }],
            },
            quantitativePrecipitation: { uom: "wmoUnit:mm", values: [] },
            iceAccumulation: { uom: "wmoUnit:mm", values: [] },
            snowfallAmount: { uom: "wmoUnit:mm", values: [] },
          },
        };

        response.json.resolves(gridpoint);
      });

      after(() => {
        clock.restore();
      });

      describe("gets the right set of days", () => {
        it("when the start is after 6am local", async () => {
          const actual = await forecast({ grid: {}, place, isMarine: true });

          // Convert embedded day.js objects into ISO strings
          actual.daily.days.forEach((day) => {
            day.hours.forEach((hour) => {
              hour.time = dayjs(hour.time).toISOString();
            });
          });

          expect(actual).to.eql({
            gridData: { geometry: "ball" },
            daily: {
              days: [
                {
                  dayNumericString: "02",
                  monthNumericString: "03",

                  // UTC-8 for Los Angeles in daylight saving time
                  start: "1990-03-02T14:00:00.000Z",
                  end: "1990-03-03T14:00:00.000Z",

                  // Marine forecast days are not broken into periods, so this
                  // array should be empty
                  periods: [],

                  // Max PoP is calculated from day periods. Since there are no
                  // day periods for marine forecasts, there is no max PoP.
                  maxPop: 0,

                  // Computed
                  qpf: {
                    hasQPF: false,
                    hasIce: false,
                    hasSnow: false,
                    periods: [],
                  },

                  // The hours available in this day are derived from the mocked
                  // API data.
                  hours: [
                    {
                      temperature: { degC: 3, degF: 37 },
                      time: "1990-03-03T04:00:00.000Z",
                    },
                    {
                      temperature: { degC: 3, degF: 37 },
                      time: "1990-03-03T05:00:00.000Z",
                    },
                    {
                      temperature: { degC: 3, degF: 37 },
                      time: "1990-03-03T06:00:00.000Z",
                    },
                  ],
                },
              ],
            },
          });
        });

        it("when the start is before 6am local", async () => {
          // 3am on the 7th until 3pm on the 7th; this results in two days:
          // * 6am on the 6th through 6am on the 7th
          // * 6am on the 7th through 6am on the 8th
          gridpoint.properties.temperature.values[0].validTime =
            "1984-07-07T10:00:00Z/PT12H";

          const actual = await forecast({ grid: {}, place, isMarine: true });

          // Convert embedded day.js objects into ISO strings
          actual.daily.days.forEach((day) => {
            day.hours.forEach((hour) => {
              hour.time = dayjs(hour.time).toISOString();
            });
          });

          expect(actual.daily.days.length).to.equal(2);
          // UTC-7 during daylight saving time
          expect(actual.daily.days[0].start).to.equal(
            "1984-07-06T13:00:00.000Z",
          );
          expect(actual.daily.days[1].end).to.equal("1984-07-08T13:00:00.000Z");
        });

        it("when the end is before 6am local", async () => {
          // 2pm to 4pm on the 3rd. This results in a single day:
          // * 6am on the 3rd through 6am on the 4th
          gridpoint.properties.temperature.values[0].validTime =
            "2000-01-03T22:00:00Z/PT2H";

          const actual = await forecast({ grid: {}, place, isMarine: true });

          // Convert embedded day.js objects into ISO strings
          actual.daily.days.forEach((day) => {
            day.hours.forEach((hour) => {
              hour.time = dayjs(hour.time).toISOString();
            });
          });

          expect(actual.daily.days.length).to.equal(1);
          // UTC-8 during standard time
          expect(actual.daily.days[0].start).to.equal(
            "2000-01-03T14:00:00.000Z",
          );
          expect(actual.daily.days[0].end).to.equal("2000-01-04T14:00:00.000Z");
        });

        it("when the end is after 6am local", async () => {
          // 2pm on the third to 7am on the fourth. This results in two days:
          // * 6am on the 3rd through 6am on the 4th
          // * 6am on the 4th through 6am on the 5th
          gridpoint.properties.temperature.values[0].validTime =
            "2000-01-03T22:00:00Z/PT18H";

          const actual = await forecast({ grid: {}, place, isMarine: true });

          // Convert embedded day.js objects into ISO strings
          actual.daily.days.forEach((day) => {
            day.hours.forEach((hour) => {
              hour.time = dayjs(hour.time).toISOString();
            });
          });

          expect(actual.daily.days.length).to.equal(2);
          // UTC-8 during standard time
          expect(actual.daily.days[0].start).to.equal(
            "2000-01-03T14:00:00.000Z",
          );
          expect(actual.daily.days[1].end).to.equal("2000-01-05T14:00:00.000Z");
        });
      });
    });
  });
});
