import { expect } from "chai";
import sinon from "sinon";
import quibble from "quibble";
import qpf from "./quantitativePrecipitation.js";

describe("quantitative precipitation forecase (QPF)", () => {
  let clock,
    forecast,
    connectionPool,
    getFromRedis,
    saveToRedis,
    sandbox;
    
  before(async () => {
    sandbox = sinon.createSandbox();
    connectionPool = {
      request: sandbox.stub(),
    };
  
    getFromRedis = sandbox.stub();
    saveToRedis = sandbox.stub();

    await quibble.esm("../connectionPool.js", {}, connectionPool);
    await quibble.esm(
      "../../redis.js",
      { saveToRedis, getFromRedis },
      {},
    );

    const module = await import("./index.js");
    forecast = module.default;

    clock = sinon.useFakeTimers({ now: 0 });
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(async () => {
    sandbox.restore();
    clock.runAll();
    clock.restore();
    await quibble.reset();
  });

  it("parses the raw data", () => {
    const rawLiquid = {
      uom: "wmoUnit:mm",
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
      uom: "wmoUnit:mm",
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
      uom: "wmoUnit:mm",
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
        start: "2024-09-09T21:00:00.000Z",
        end: "2024-09-10T00:00:00.000Z",
        liquid: { uom: "wmoUnit:mm", value: 32 },
        ice: { uom: "wmoUnit:mm", value: 5 },
        snow: { uom: "wmoUnit:mm", value: 14 },
      },
      {
        start: "2024-09-10T00:00:00.000Z",
        end: "2024-09-10T06:00:00.000Z",
        liquid: { uom: "wmoUnit:mm", value: 19 },
        ice: { uom: "wmoUnit:mm", value: 1 },
        snow: { uom: "wmoUnit:mm", value: 85 },
      },
      {
        start: "2024-09-10T06:00:00.000Z",
        end: "2024-09-10T08:00:00.000Z",
        liquid: { uom: "wmoUnit:mm", value: 4 },
        ice: { uom: "wmoUnit:mm", value: 64 },
        snow: { uom: "wmoUnit:mm", value: 5 },
      },
    ];

    const actual = qpf(rawLiquid, rawIce, rawSnow, {
      timezone: "America/Chicago",
    });

    // Date objects are returned, but we want to stringify them
    for (const period of actual) {
      period.start = period.start.toISOString();
      period.end = period.end.toISOString();
    }

    expect(actual).to.eql(expected);
  });

  it("puts QPF into the right days", async () => {
    const mockRes = (data) => ({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        text: sandbox.stub().resolves(JSON.stringify(data)),
        dump: sandbox.stub().resolves(),
      },
    });

    connectionPool.request
      .withArgs(sinon.match({ path: `/gridpoints/BOB/X,Y` }))
      .resolves(
        mockRes({
          properties: {
            quantitativePrecipitation: {
              uom: "wmoUnit:mm",
              values: [
                { validTime: "2024-08-02T01:00:00Z/PT8H", value: 9 },
                { validTime: "2024-08-02T09:00:00Z/PT6H", value: 100 },
                { validTime: "2024-08-02T15:00:00Z/PT8H", value: 4 },
              ],
            },
            iceAccumulation: {
              uom: "wmoUnit:mm",
              values: [
                { validTime: "2024-08-02T01:00:00Z/PT8H", value: 19 },
                { validTime: "2024-08-02T09:00:00Z/PT6H", value: 10 },
              ],
            },
            snowfallAmount: {
              uom: "wmoUnit:mm",
              values: [{ validTime: "2024-08-02T01:00:00Z/PT8H", value: 29 }],
            },
          },
        }),
      );

    connectionPool.request
      .withArgs(sinon.match({ path: `/gridpoints/BOB/X,Y/forecast` }))
      .resolves(
        mockRes({
          properties: {
            periods: [
              {
                startTime: "2024-08-01T06:00:00-0700",
                endTime: "2024-08-02T06:00:00-0700",
                isDaytime: true,
                probabilityOfPrecipitation: {
                  unitCode: "wmoUnit:percent",
                  value: 40,
                },
              },
              {
                startTime: "2024-08-02T06:00:00-0700",
                endTime: "2024-08-03T06:00:00-0700",
                isDaytime: true,
                probabilityOfPrecipitation: {
                  unitCode: "wmoUnit:percent",
                  value: 40,
                },
              },
            ],
          },
        }),
      );
    connectionPool.request
      .withArgs(sinon.match({ path: `/gridpoints/BOB/X,Y/forecast/hourly` }))
      .resolves(
        mockRes({
          properties: { periods: [] },
        }),
      );

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
    //   • Day 1, 9 mm and 100 mm
    //   • Day 2, 100 mm and 4 mm

    const expectedDay1 = {
      hasQPF: true,
      hasIce: true,
      hasSnow: true,
      periods: [
        {
          start: "2024-08-02T01:00:00.000Z",
          end: "2024-08-02T09:00:00.000Z",
          liquid: { mm: 9, in: 0.35 },
          ice: { mm: 19, in: 0.75 },
          snow: { mm: 29, in: 1.14 },
        },
        {
          start: "2024-08-02T09:00:00.000Z",
          end: "2024-08-02T15:00:00.000Z",
          liquid: { mm: 100, in: 3.94 },
          ice: { mm: 10, in: 0.39 },
          snow: { mm: null, in: null },
        },
      ],
    };

    const expectedDay2 = {
      hasQPF: true,
      hasIce: true,
      hasSnow: false,
      periods: [
        {
          start: "2024-08-02T09:00:00.000Z",
          end: "2024-08-02T15:00:00.000Z",
          liquid: { mm: 100, in: 3.94 },
          ice: { mm: 10, in: 0.39 },
          snow: { mm: null, in: null },
        },
        {
          start: "2024-08-02T15:00:00.000Z",
          end: "2024-08-02T23:00:00.000Z",
          liquid: { mm: 4, in: 0.16 },
          ice: { mm: null, in: null },
          snow: { mm: null, in: null },
        },
      ],
    };

    const actual = await forecast({ grid, place });

    expect(actual.error, "Forecast returned an error").to.be.undefined;

    // Date objects are returned, but we want to stringify them
    for (const day of actual.daily.days) {
      for (const period of day.qpf.periods) {
        period.start = period.start.toISOString();
        period.end = period.end.toISOString();
      }
    }

    expect(actual.daily.days[0].qpf, "day 0 has the expected qpf").to.eql(
      expectedDay1,
    );
    expect(actual.daily.days[1].qpf, "day 1 has the expected qpf").to.eql(
      expectedDay2,
    );
  });
});
