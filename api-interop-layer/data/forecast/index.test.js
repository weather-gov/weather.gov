import sinon from "sinon";
import { expect } from "chai";
import dayjs from "../../util/day.js";
import quibble from "quibble";
import { assignHoursToDays } from "./index.js";

const place = {
  timezone: "America/Los_Angeles",
};

describe("Forecast index", () => {
  let saveToRedis,
    getFromRedis,
    connectionPool,
    basicResponse,
    forecast,
    sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();
    saveToRedis = sandbox.stub();
    getFromRedis = sandbox.stub();

    connectionPool = {
      request: sandbox.stub(),
    };

    basicResponse = {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        text: sandbox.stub(),
        dump: sandbox.stub().resolves(),
      },
    };

    await quibble.esm("../connectionPool.js", {}, connectionPool);
    await quibble.esm("../../redis.js", { saveToRedis, getFromRedis }, {});

    const module = await import("./index.js");
    forecast = module.default;
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
    connectionPool.request.resolves(basicResponse);
    basicResponse.statusCode = 200;
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
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
          { time: new Date("1988-02-13T10:00:00Z") },
          { time: new Date("1988-02-13T11:00:00Z") },
          { time: new Date("1988-02-13T12:00:00Z") },
          { time: new Date("1988-02-13T13:00:00Z") },
          // These are on or after. Only these should be included. We need to
          // go through and past the day's end time since this is the first
          // day. The number of hours to include in the first day is based on
          // finding the first hour that is not within this forecast day.
          { time: new Date("1988-02-13T14:00:00Z") },
          { time: new Date("1988-02-13T15:00:00Z") },
          { time: new Date("1988-02-13T16:00:00Z") },
          { time: new Date("1988-02-13T17:00:00Z") },
          // Last hour of the forecast day
          { time: new Date("1988-02-14T06:00:00Z") },
          // One hour past the forecast day. This one should not be included.
          { time: new Date("1988-02-14T07:00:00Z") },
        ];

        assignHoursToDays(days, hours, startEndMap);

        expect(days.days[0].hours).to.eql([
          hours[4],
          hours[5],
          hours[6],
          hours[7],
          hours[8],
        ]);
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
          // the after the end of the first day. The time
          // is not checked for any subsequent hours because we
          // rely on the number of hours instead of the times.
          { time: new Date("1988-06-23T04:00:00Z") },
          { time: new Date("1988-06-23T05:00:00Z") },
          // Last hour of day 1, first hour of day 2
          { time: new Date("1988-06-23T06:00:00Z") },
          { time: new Date("1988-06-23T07:00:00Z") },
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
        expect(days.days[0].hours).to.eql([hours[0], hours[1], hours[2]]);

        // The second day should start with the same value that the
        // previous day ended with, and then then next 24 hours.
        expect(days.days[1].hours).to.eql([
          hours[2],
          hours[3],
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

    it("throws an error if the hourly request responds 403", async () => {
      const badResponse = {
        statusCode: 403,
        body: {
          text: sandbox.stub().resolves(""),
          dump: sandbox.stub().resolves(),
        },
      };
      connectionPool.request
        .withArgs(sinon.match({ path: `/gridpoints/TST/1,1/forecast/hourly` }))
        .resolves(badResponse);

      let threwError = false;
      try {
        await forecast({
          grid: { wfo: "TST", x: 1, y: 1 },
          place,
          isMarine: false,
        });
      } catch (e) {
        if (e.cause?.statusCode === 403) {
          threwError = true;
        }
      }

      expect(threwError).to.equal(true);
    });

    it("throws an error if the gridpoint request responds with 403", async () => {
      const badResponse = {
        statusCode: 403,
        body: {
          text: sandbox.stub().resolves(""),
          dump: sandbox.stub().resolves(),
        },
      };
      connectionPool.request
        .withArgs(sinon.match({ path: `/gridpoints/TST/1,1` }))
        .resolves(badResponse);

      let threwError = false;
      try {
        await forecast({
          grid: { wfo: "TST", x: 1, y: 1 },
          place,
          isMarine: false,
        });
      } catch (e) {
        if (e.cause?.statusCode === 403) {
          threwError = true;
        }
      }

      expect(threwError).to.equal(true);
    });

    it("throws an error if the daily request responds with 403", async () => {
      const badResponse = {
        statusCode: 403,
        body: {
          text: sandbox.stub().resolves(""),
          dump: sandbox.stub().resolves(),
        },
      };
      connectionPool.request
        .withArgs(sinon.match({ path: `/gridpoints/TST/1,1/forecast` }))
        .resolves(badResponse);

      let threwError = false;
      try {
        await forecast({
          grid: { wfo: "TST", x: 1, y: 1 },
          place,
          isMarine: false,
        });
      } catch (e) {
        if (e.cause?.statusCode === 403) {
          threwError = true;
        }
      }

      expect(threwError).to.equal(true);
    });

    it("calls the expected endpoints", async () => {
      basicResponse.body.text.resolves([{}, {}]);
      await forecast({
        grid: { wfo: "TST", x: 49488, y: 34 },
        place,
        isMarine: false,
      });

      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/gridpoints/TST/49488,34` }),
        ),
      ).to.be.true;
      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/gridpoints/TST/49488,34/forecast` }),
        ),
      ).to.be.true;
      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/gridpoints/TST/49488,34/forecast/hourly` }),
        ),
      ).to.be.true;
    });
  });

  describe("for a marine point", () => {
    it("calls the expected API endpoints", async () => {
      basicResponse.body.text.resolves([{}, {}]);
      await forecast({
        grid: { wfo: "TST", x: 49488, y: 34 },
        place,
        isMarine: true,
      });

      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/gridpoints/TST/49488,34` }),
        ),
      ).to.be.true;

      // These two should ***NOT*** be called for a marine point.
      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/gridpoints/TST/49488,34/forecast` }),
        ),
      ).to.be.false;
      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/gridpoints/TST/49488,34/forecast/hourly` }),
        ),
      ).to.be.false;
    });

    describe("with valid data", () => {
      let clock, marineResponse, gridpoint;

      before(() => {
        marineResponse = {
          statusCode: 200,
          headers: { "content-type": "application/json" },
          body: {
            text: sandbox.stub(),
            dump: sandbox.stub().resolves(),
          },
        };
        clock = sinon.useFakeTimers({ now: 0 });
      });

      beforeEach(() => {
        clock.reset();

        // Override the default beforeEach behavior for this block
        connectionPool.request.resolves(marineResponse);

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
      });

      after(() => {
        clock.restore();
      });

      describe("gets the right set of days", () => {
        it("when the start is after 6am local", async () => {
          marineResponse.body.text.resolves(JSON.stringify(gridpoint));
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
                  start: new Date("1990-03-02T14:00:00.000Z"),
                  end: new Date("1990-03-03T14:00:00.000Z"),

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
          marineResponse.body.text.resolves(JSON.stringify(gridpoint));
          const actual = await forecast({ grid: {}, place, isMarine: true });

          // Convert embedded day.js objects into ISO strings
          actual.daily.days.forEach((day) => {
            day.hours.forEach((hour) => {
              hour.time = dayjs(hour.time).toISOString();
            });
          });

          expect(actual.daily.days.length).to.equal(2);
          // UTC-7 during daylight saving time
          expect(actual.daily.days[0].start.toISOString()).to.equal(
            "1984-07-06T13:00:00.000Z",
          );
          expect(actual.daily.days[1].end.toISOString()).to.equal(
            "1984-07-08T13:00:00.000Z",
          );
        });

        it("when the end is before 6am local", async () => {
          // 2pm to 4pm on the 3rd. This results in a single day:
          // * 6am on the 3rd through 6am on the 4th
          gridpoint.properties.temperature.values[0].validTime =
            "2000-01-03T22:00:00Z/PT2H";
          marineResponse.body.text.resolves(JSON.stringify(gridpoint));
          const actual = await forecast({ grid: {}, place, isMarine: true });

          // Convert embedded day.js objects into ISO strings
          actual.daily.days.forEach((day) => {
            day.hours.forEach((hour) => {
              hour.time = dayjs(hour.time).toISOString();
            });
          });

          expect(actual.daily.days.length).to.equal(1);
          // UTC-8 during standard time
          expect(actual.daily.days[0].start.toISOString()).to.equal(
            "2000-01-03T14:00:00.000Z",
          );
          expect(actual.daily.days[0].end.toISOString()).to.equal(
            "2000-01-04T14:00:00.000Z",
          );
        });

        it("when the end is after 6am local", async () => {
          // 2pm on the third to 7am on the fourth. This results in two days:
          // * 6am on the 3rd through 6am on the 4th
          // * 6am on the 4th through 6am on the 5th
          gridpoint.properties.temperature.values[0].validTime =
            "2000-01-03T22:00:00Z/PT18H";
          marineResponse.body.text.resolves(JSON.stringify(gridpoint));
          const actual = await forecast({ grid: {}, place, isMarine: true });

          // Convert embedded day.js objects into ISO strings
          actual.daily.days.forEach((day) => {
            day.hours.forEach((hour) => {
              hour.time = dayjs(hour.time).toISOString();
            });
          });

          expect(actual.daily.days.length).to.equal(2);
          // UTC-8 during standard time
          expect(actual.daily.days[0].start.toISOString()).to.equal(
            "2000-01-03T14:00:00.000Z",
          );
          expect(actual.daily.days[1].end.toISOString()).to.equal(
            "2000-01-05T14:00:00.000Z",
          );
        });
      });
    });
  });
});
