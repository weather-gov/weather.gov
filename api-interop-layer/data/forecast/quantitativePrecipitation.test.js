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
    const raw = {
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

    const expected = [
      {
        start: dayjs("2024-09-09T21:00:00Z"),
        end: dayjs("2024-09-10T00:00:00Z"),
        uom: "raw-units",
        value: 32,
        startHour: "4 PM",
        endHour: "7 PM",
      },
      {
        start: dayjs("2024-09-10T00:00:00Z"),
        end: dayjs("2024-09-10T06:00:00Z"),
        uom: "raw-units",
        value: 19,
        startHour: "7 PM",
        endHour: "1 AM",
      },
      {
        start: dayjs("2024-09-10T06:00:00Z"),
        end: dayjs("2024-09-10T08:00:00Z"),
        uom: "raw-units",
        value: 4,
        startHour: "1 AM",
        endHour: "3 AM",
      },
    ];

    const actual = qpf(raw, { timezone: "America/Chicago" });

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
              {
                validTime: "2024-09-10T01:00:00Z/PT4H",
                value: 9,
              },
              { validTime: "2024-09-10T05:00:00Z/PT20H", value: 100 },
              { validTime: "2024-09-11T01:00:00Z/PT3H", value: 4 },
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
                startTime: "2024-09-10T03:00:00Z",
                endTime: "2024-09-10T09:00:00Z",
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

    const expected = [
      {
        start: dayjs("2024-09-10T01:00:00Z"),
        end: dayjs("2024-09-10T05:00:00Z"),
        uom: "some units",
        value: 9,
        startHour: "6 PM",
        endHour: "10 PM",
      },
      {
        start: dayjs("2024-09-10T05:00:00Z"),
        end: dayjs("2024-09-11T01:00:00Z"),
        uom: "some units",
        value: 100,
        startHour: "10 PM",
        endHour: "6 PM",
      },
    ];

    const actual = await forecast({ grid, place });

    expect(actual.daily.days[0].qpf).to.eql(expected);
  });
});
