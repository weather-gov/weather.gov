import { expect } from "chai";
import dayjs from "../../util/day.js";
import gridpoint from "./gridpoint.js";

const place = {
  timezone: "America/Los_Angeles",
};

describe("gridpoint data module", () => {
  it("propagates errors", async () => {
    const expected = { error: true };
    const actual = await gridpoint({ error: true }, [], place);

    expect(actual).to.eql(expected);
  });

  it("puts data into the hourly map", async () => {
    const hours = new Map();

    const expected = new Map([
      [
        "2020-01-01T12:00:00.000Z",
        {
          time: dayjs("2020-01-01T12:00:00.000Z"),
          rain: { uom: "unit", value: 3 },
          wind: { uom: "unit", value: 5 },
        },
      ],
      [
        "2020-01-01T13:00:00.000Z",
        {
          time: dayjs("2020-01-01T13:00:00.000Z"),
          rain: { uom: "unit", value: 3 },
          wind: { uom: "unit", value: 5 },
        },
      ],
      [
        "2020-01-01T14:00:00.000Z",
        {
          time: dayjs("2020-01-01T14:00:00.000Z"),
          rain: { uom: "unit", value: 3 },
          wind: { uom: "unit", value: 12 },
        },
      ],
      [
        "2020-01-01T15:00:00.000Z",
        {
          time: dayjs("2020-01-01T15:00:00.000Z"),
          rain: { uom: "unit", value: 10 },
          wind: { uom: "unit", value: 12 },
        },
      ],
      [
        "2020-01-01T16:00:00.000Z",
        {
          time: dayjs("2020-01-01T16:00:00.000Z"),
          rain: { uom: "unit", value: 10 },
          wind: { uom: "unit", value: 12 },
        },
      ],
      [
        "2020-01-01T17:00:00.000Z",
        {
          time: dayjs("2020-01-01T17:00:00.000Z"),
          rain: { uom: "unit", value: 25 },
          wind: { uom: "unit", value: 12 },
        },
      ],
      [
        "2020-01-01T18:00:00.000Z",
        {
          time: dayjs("2020-01-01T18:00:00.000Z"),
          rain: { uom: "unit", value: 25 },
          wind: { uom: "unit", value: 27 },
        },
      ],
      [
        "2020-01-01T19:00:00.000Z",
        {
          time: dayjs("2020-01-01T19:00:00.000Z"),
          rain: { uom: "unit", value: 25 },
          wind: { uom: "unit", value: 27 },
        },
      ],
      [
        "2020-01-01T20:00:00.000Z",
        {
          time: dayjs("2020-01-01T20:00:00.000Z"),
          rain: { uom: "unit", value: 25 },
          wind: { uom: "unit", value: 27 },
        },
      ],
    ]);

    const data = {
      properties: {
        quantitativePrecipitation: { uom: "rain", values: [] },
        iceAccumulation: { uom: "slippery", values: [] },
        snowfallAmount: { uom: "fun", values: [] },
        rain: {
          uom: "unit",
          values: [
            {
              validTime: "2020-01-01T12:00:00Z/PT3H",
              value: 3,
            },
            {
              validTime: "2020-01-01T15:00:00Z/PT2H",
              value: 10,
            },
            {
              validTime: "2020-01-01T17:00:00Z/PT4H",
              value: 25,
            },
          ],
        },
        wind: {
          uom: "unit",
          values: [
            {
              validTime: "2020-01-01T12:00:00Z/PT2H",
              value: 5,
            },
            {
              validTime: "2020-01-01T14:00:00Z/PT4H",
              value: 12,
            },
            {
              validTime: "2020-01-01T18:00:00Z/PT3H",
              value: 27,
            },
          ],
        },
        notAValue: {
          doesNotHave: "uom",
          or: "values",
        },
      },
    };

    await gridpoint(data, hours, place);

    /* eslint-disable-next-line no-restricted-syntax */
    for (const [key, value] of expected) {
      expect(hours.has(key)).to.be.true;
      expect(hours.get(key)).to.eql(value);
    }
  });

  it("returns the grid geometry returned by this endpoint", async () => {
    const hours = new Map();

    const data = {
      geometry: "this is the geometry",
      properties: {
        quantitativePrecipitation: { uom: "rain", values: [] },
        iceAccumulation: { uom: "slippery", values: [] },
        snowfallAmount: { uom: "fun", values: [] },
      },
    };

    const { geometry } = await gridpoint(data, hours, place);

    expect(geometry).to.equal("this is the geometry");
  });

  it("returns the QPF data derived from this endpoint", async () => {
    const hours = new Map();

    const data = {
      properties: {
        quantitativePrecipitation: {
          uom: "wet",
          values: [
            {
              validTime: "2020-01-01T12:00:00Z/PT3H",
              value: 3,
            },
          ],
        },
        iceAccumulation: {
          uom: "slippery",
          values: [
            {
              validTime: "2020-01-01T12:00:00Z/PT3H",
              value: 30,
            },
          ],
        },
        snowfallAmount: {
          uom: "fun",
          values: [
            {
              validTime: "2020-01-01T12:00:00Z/PT3H",
              value: 300,
            },
          ],
        },
      },
    };

    const expected = [
      {
        start: dayjs("2020-01-01T12:00:00Z"),
        end: dayjs("2020-01-01T15:00:00Z"),
        liquid: { uom: "wet", value: 3 },
        ice: { uom: "slippery", value: 30 },
        snow: { uom: "fun", value: 300 },

        // Our time starts at midnight UTC during standard time. America/Los_Angeles
        // is UTC-8 during standard time, so we expect 4 AM to 7 AM.
        startHour: "4 AM",
        endHour: "7 AM",
      },
    ];

    const { qpf } = await gridpoint(data, hours, place);

    expect(qpf).to.eql(expected);
  });
});
