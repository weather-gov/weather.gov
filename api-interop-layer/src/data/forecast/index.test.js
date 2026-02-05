import sinon from "sinon";
import { expect } from "chai";
import dayjs from "../../util/day.js";
import forecast, { assignHoursToDays } from "./index.js";

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
    describe("assigns hours to days", () => {
      it("when the hourly forecast starts before the daily forecast", () => {
        const days = {
          // Days have to have periods because the max PoP gets updated
          // within this method under test. But if we make the periods
          // an empty array, it'll just zip right through and won't
          // pollute our tests.
          days: [{ periods: [] }],
        };

        const startEndMap = new Map([
          [
            days.days[0],
            {
              // The Winter Olympics begin in Calgary, Alberta, Canada.
              // The start time is 2pm. For the tests, not for the Olympics.
              // I have no idea what time the Olympics started, but probably
              // at night?
              start: dayjs("1988-02-13T14:00:00Z"),
              // The end time is 6am the next day.
              end: dayjs("1988-02-14T06:00:00Z"),
            },
          ],
        ]);

        const hours = [
          // These are before the start of the forecast day.
          { time: dayjs("1988-02-13T10:00:00Z") },
          { time: dayjs("1988-02-13T11:00:00Z") },
          { time: dayjs("1988-02-13T12:00:00Z") },
          { time: dayjs("1988-02-13T13:00:00Z") },
          // These are on or after. Only these should be included.
          { time: dayjs("1988-02-13T14:00:00Z") },
          { time: dayjs("1988-02-13T15:00:00Z") },
        ];

        assignHoursToDays(days, hours, startEndMap);

        expect(days.days[0].hours).to.eql([hours[4], hours[5]]);
      });

      it("applies hours in 24-hour chunks after the first day", () => {
        const days = {
          days: [{ periods: [] }, { periods: [] }],
        };

        const startEndMap = new Map([
          [
            days.days[0],
            {
              // Dr. James Hansen, director of the NASA Goddard Institute
              // for Space Studies, testifies before Congress that the
              // Earth is warming due to human activities, the first time
              // Congress was warned about anthropogenic climate change.
              start: dayjs("1988-06-23T04:00:00Z"),
              end: dayjs("1988-06-23T06:00:00Z"),
            },
          ],
          [
            days.days[1],
            {
              start: dayjs("1988-06-23T06:00:00Z"),
              end: dayjs("1988-06-24T06:00:00Z"),
            },
          ],
        ]);

        const hours = [
          // The time property of the hours is only checked for
          // the hours *up to and including* the first one that is
          // the same or after the start of the first day. The time
          // is not checked for any subsequent hours because we
          // rely on the number of hours instead of the times.
          { time: dayjs("1988-06-23T04:00:00Z") },
          "05-1",
          "06-1", // Last hour of day 1, first hour of day 2
          "07-2",
          "08-2",
          "09-2",
          "10-2",
          "11-2",
          "12-2",
          "13-2",
          "14-2",
          "15-2",
          "16-2",
          "17-2",
          "18-2",
          "19-2",
          "20-2",
          "21-2",
          "22-2",
          "23-2",
          "00-2",
          "01-2",
          "02-2",
          "03-2",
          "04-2",
          "05-2",
          "06-2", // Last hour of day 2
          "07-3", // ------
          "08-3", // There are only two days in the daily forecast,
          "09-3", // so the hours below this line shouldn't appear
          "10-3", // anywhere. Put them in for testing though to
          "11-3", // ensure nothing explodes when there are more
          "12-3", // hours than days to put them in.
          "13-3",
          "14-3",
          "15-3",
          "16-3",
          "17-3",
          "18-3",
          "19-3",
          "20-3",
          "21-3",
          "22-3",
          "23-3",
          "00-3",
          "01-3",
          "02-3",
          "03-3",
          "04-3",
          "05-3",
          "06-3",
        ];

        assignHoursToDays(days, hours, startEndMap);

        // The first day should only have three hours.
        expect(days.days[0].hours).to.eql([hours[0], "05-1", "06-1"]);

        // The second day should start with the same value that the
        // previous day ended with, and then then next 24 hours.
        expect(days.days[1].hours).to.eql([
          "06-1",
          "07-2",
          "08-2",
          "09-2",
          "10-2",
          "11-2",
          "12-2",
          "13-2",
          "14-2",
          "15-2",
          "16-2",
          "17-2",
          "18-2",
          "19-2",
          "20-2",
          "21-2",
          "22-2",
          "23-2",
          "00-2",
          "01-2",
          "02-2",
          "03-2",
          "04-2",
          "05-2",
          "06-2",
        ]);
      });
    });

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
