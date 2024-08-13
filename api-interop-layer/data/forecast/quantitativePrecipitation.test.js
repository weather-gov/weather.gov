import sinon from "sinon";
import dayjs from "dayjs";
import { expect } from "chai";
import qpf from "./quantitativePrecipitation.js";
import forecast from "./index.js";

describe("quantitative precipitation forecase (QPF)", () => {
  let clock;
  before(() => {
    clock = sinon.useFakeTimers({ now: 0 });
  });

  after(() => {
    clock.restore();
  });

  it("parses the raw data", () => {
    const rawLiquid = {
      uom: "raw-units",
      values: [
        {
          validTime: "2024-09-09T21:00:00Z/PT3H",
          value: 32,
        },
        {
          validTime: "2024-09-10T00:00:00Z/PT6H",
          value: 19,
        },
        { validTime: "2024-09-10T06:00:00Z/PT2H", value: 4 },
      ],
    };
    const rawIce = {
      uom: "raw-units-ice",
      values: [
        {
          validTime: "2024-09-09T21:00:00Z/PT3H",
          value: 5,
        },
        {
          validTime: "2024-09-10T00:00:00Z/PT6H",
          value: 1,
        },
        { validTime: "2024-09-10T06:00:00Z/PT2H", value: 64 },
      ],
    };
    const rawSnow = {
      uom: "raw-units-snow",
      values: [
        {
          validTime: "2024-09-09T21:00:00Z/PT3H",
          value: 14,
        },
        {
          validTime: "2024-09-10T00:00:00Z/PT6H",
          value: 85,
        },
        { validTime: "2024-09-10T06:00:00Z/PT2H", value: 5 },
      ],
    };

    const expected = [
      {
        start: dayjs("2024-09-09T21:00:00Z"),
        end: dayjs("2024-09-10T00:00:00Z"),
        liquid: { uom: "raw-units", value: 32 },
        ice: { uom: "raw-units-ice", value: 5 },
        snow: { uom: "raw-units-snow", value: 14 },
        startHour: "4 PM",
        endHour: "7 PM",
      },
      {
        start: dayjs("2024-09-10T00:00:00Z"),
        end: dayjs("2024-09-10T06:00:00Z"),
        liquid: { uom: "raw-units", value: 19 },
        ice: { uom: "raw-units-ice", value: 1 },
        snow: { uom: "raw-units-snow", value: 85 },
        startHour: "7 PM",
        endHour: "1 AM",
      },
      {
        start: dayjs("2024-09-10T06:00:00Z"),
        end: dayjs("2024-09-10T08:00:00Z"),
        liquid: { uom: "raw-units", value: 4 },
        ice: { uom: "raw-units-ice", value: 64 },
        snow: { uom: "raw-units-snow", value: 5 },
        startHour: "1 AM",
        endHour: "3 AM",
      },
    ];

    const actual = qpf(rawLiquid, rawIce, rawSnow, {
      timezone: "America/Chicago",
    });

    expect(actual).to.eql(expected);
  });

  it("puts QPF into the right days", async () => {
    fetch.withArgs("https://api.weather.gov/gridpoints/BOB/X,Y").resolves({
      status: 200,
      json: sinon.stub().resolves({
        properties: {
          quantitativePrecipitation: {
            uom: "some units",
            values: [
              // These times are UTC. They'll be converted to the timezone
              // specified below.
              {
                validTime: "2024-08-02T01:00:00Z/PT8H",
                value: 9,
              },
              { validTime: "2024-08-02T09:00:00Z/PT6H", value: 100 },
              { validTime: "2024-08-02T15:00:00Z/PT8H", value: 4 },
            ],
          },
          iceAccumulation: {
            uom: "ice units",
            values: [
              {
                validTime: "2024-08-02T01:00:00Z/PT8H",
                value: 19,
              },
              { validTime: "2024-08-02T09:00:00Z/PT6H", value: 10 },
            ],
          },
          snowfallAmount: {
            uom: "snow units",
            values: [
              {
                validTime: "2024-08-02T01:00:00Z/PT8H",
                value: 29,
              },
            ],
          },
        },
      }),
    });

    fetch
      .withArgs("https://api.weather.gov/gridpoints/BOB/X,Y/forecast")
      .resolves({
        status: 200,
        json: sinon.stub().resolves({
          properties: {
            periods: [
              {
                startTime: "2024-08-01T06:00:00-0700",
                endTime: "2024-08-02T06:00:00-0700",
              },
              {
                startTime: "2024-08-02T06:00:00-0700",
                endTime: "2024-08-03T06:00:00-0700",
              },
            ],
          },
        }),
      });

    fetch
      .withArgs("https://api.weather.gov/gridpoints/BOB/X,Y/forecast/hourly")
      .resolves({
        status: 200,
        json: sinon.stub().resolves({
          properties: {
            periods: [],
          },
        }),
      });

    const grid = {
      wfo: "BOB",
      x: "X",
      y: "Y",
    };

    const place = {
      timezone: "America/Los_Angeles",
    };

    // Day periods are (local time):
    //   • 6AM to 6AM, 08/01 to 08/02
    //   • 2AM to 5AM, 08/02 to 08/03
    //
    // QPF periods are (local time):
    //   • 6PM to 2AM on 08/01 to 08/02
    //     9 inches (1am to 9am UTC)
    //   • 2AM to 8AM on 08/02
    //     100 inches (9am to 3pm UTC)
    //   • 8AM to 4PM, on 08/02
    //     4 inches (3pm to 9pm UTC)
    //
    // So we expect to have two days in the resulting data, and each of them
    // should have two QPF periods:
    //   • Day 1, 9 inches and 100 inches
    //   • Day 2, 100 inches and 4 inches

    const expectedDay1 = [
      {
        start: dayjs("2024-08-02T01:00:00Z"),
        end: dayjs("2024-08-02T09:00:00Z"),
        liquid: { uom: "some units", value: 9 },
        ice: { uom: "ice units", value: 19 },
        snow: { uom: "snow units", value: 29 },
        startHour: "6 PM",
        endHour: "2 AM",
      },
      {
        start: dayjs("2024-08-02T09:00:00Z"),
        end: dayjs("2024-08-02T15:00:00Z"),
        liquid: { uom: "some units", value: 100 },
        ice: { uom: "ice units", value: 10 },
        snow: { uom: "snow units", value: null },
        startHour: "2 AM",
        endHour: "8 AM",
      },
    ];

    const expectedDay2 = [
      {
        start: dayjs("2024-08-02T09:00:00Z"),
        end: dayjs("2024-08-02T15:00:00Z"),
        liquid: { uom: "some units", value: 100 },
        ice: { uom: "ice units", value: 10 },
        snow: { uom: "snow units", value: null },
        startHour: "2 AM",
        endHour: "8 AM",
      },
      {
        start: dayjs("2024-08-02T15:00:00Z"),
        end: dayjs("2024-08-02T23:00:00Z"),
        liquid: { uom: "some units", value: 4 },
        ice: { uom: "ice units", value: null },
        snow: { uom: "snow units", value: null },
        startHour: "8 AM",
        endHour: "4 PM",
      },
    ];

    const actual = await forecast({ grid, place });

    expect(actual.daily.days[0].qpf).to.eql(expectedDay1);
    expect(actual.daily.days[1].qpf).to.eql(expectedDay2);
  });
});
