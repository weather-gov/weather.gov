import { expect } from "chai";
import sinon from "sinon";
import quibble from "quibble";

describe("wpcProbPrecip module", () => {
  let openDatabase, db, getWpcProbPrecip, sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();

    openDatabase = sandbox.stub();
    db = { query: sandbox.stub() };
    openDatabase.resolves(db);

    await quibble.esm("./db.js", {}, openDatabase);

    const module = await import("./wpcProbPrecip.js");
    getWpcProbPrecip = module.getWpcProbPrecip;
  });

  beforeEach(() => {
    sandbox.resetHistory();
    db.query.reset();
    openDatabase.resolves(db);
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  // One period's rain slice: accumulation, then 7 percentiles, then 11 threshold probabilities
  const rainPeriod = ({
    accumulation = 0,
    percentiles = [0, 0, 0, 0, 0, 0, 0],
    probabilities = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  } = {}) => [accumulation, ...percentiles, ...probabilities];

  const row = (rainData, validTimes = ["2026-07-22T12:00:00Z"]) => ({
    rows: [
      {
        rain_data: rainData,
        snow_data: null,
        freezing_rain_data: null,
        cycle: new Date("2026-07-21T12:00:00Z"),
        valid_times: validTimes.map((t) => new Date(t)),
      },
    ],
  });

  it("queries by wfo, x, and y", async () => {
    db.query.resolves({ rows: [] });

    await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(db.query.calledWith(sinon.match.string, ["MPX", 30, 40])).to.be.true;
  });

  it("reports one 24-hour period per valid time", async () => {
    db.query.resolves(
      row(null, [
        "2026-07-22T12:00:00Z",
        "2026-07-23T12:00:00Z",
        "2026-07-24T06:00:00Z",
      ]),
    );

    const actual = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(actual.cycle).to.eql(new Date("2026-07-21T12:00:00Z"));
    expect(actual.periods.map(({ period }) => period)).to.eql([
      {
        start: new Date("2026-07-21T12:00:00Z"),
        end: new Date("2026-07-22T12:00:00Z"),
        hours: 24,
      },
      {
        start: new Date("2026-07-22T12:00:00Z"),
        end: new Date("2026-07-23T12:00:00Z"),
        hours: 24,
      },
      {
        start: new Date("2026-07-23T06:00:00Z"),
        end: new Date("2026-07-24T06:00:00Z"),
        hours: 24,
      },
    ]);
  });

  it("reads each period out of its own slice of the stored array", async () => {
    db.query.resolves(
      row(
        [
          ...rainPeriod({ accumulation: 0.25 }),
          ...rainPeriod({ accumulation: 1.5 }),
          ...rainPeriod({ accumulation: 3 }),
        ],
        [
          "2026-07-22T12:00:00Z",
          "2026-07-23T12:00:00Z",
          "2026-07-24T06:00:00Z",
        ],
      ),
    );

    const { periods } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(periods.map(({ rain }) => rain.accumulation)).to.eql([0.25, 1.5, 3]);
  });

  it("brackets low and high off the percentiles and takes expected from the accumulation", async () => {
    db.query.resolves(
      row(
        rainPeriod({
          accumulation: 0.6799212694168091,
          percentiles: [
            0, 0.31799212098121643, 0, 0.9550787806510925, 0,
            1.9838975667953491, 0,
          ],
        }),
      ),
    );

    const { periods } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });
    const { rain } = periods[0];

    expect(rain.accumulation).to.equal(0.68);
    expect(rain.range).to.eql({
      low: { amount: 0.32, chance: 0.9 },
      expected: { amount: 0.68, chance: 0.5 },
      high: { amount: 1.98, chance: 0.1 },
    });
  });

  it("labels percentiles and thresholds by position, ascending", async () => {
    db.query.resolves(
      row(
        rainPeriod({
          percentiles: [0.05, 0.1, 0, 0.5, 0, 0, 0],
          probabilities: [0, 0, 0, 0, 48.2, 9, 0, 0, 0, 0, 0],
        }),
      ),
    );

    const { periods } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });
    const { rain } = periods[0];

    expect(rain.percentiles).to.eql([
      { percentile: 5, amount: 0.05 },
      { percentile: 10, amount: 0.1 },
      { percentile: 25, amount: 0 },
      { percentile: 50, amount: 0.5 },
      { percentile: 75, amount: 0 },
      { percentile: 90, amount: 0 },
      { percentile: 95, amount: 0 },
    ]);
    expect(rain.probabilities.slice(4, 6)).to.eql([
      { atLeast: 1, chance: 0.48 },
      { atLeast: 2, chance: 0.09 },
    ]);
    expect(rain.probabilities.map(({ atLeast }) => atLeast)).to.eql([
      0.01, 0.1, 0.25, 0.5, 1, 2, 3, 4, 6, 8, 12,
    ]);
  });

  it("skips the slots the task left as NaN", async () => {
    const slice = rainPeriod({ accumulation: 0.5 });
    slice[1] = NaN;
    slice[1 + 7] = NaN;
    db.query.resolves(row(slice));

    const { periods } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });
    const { rain } = periods[0];

    expect(rain.percentiles.map(({ percentile }) => percentile)).to.eql([
      10, 25, 50, 75, 90, 95,
    ]);
    expect(rain.probabilities).to.have.lengthOf(10);
  });

  it("returns null for a period that decoded to all zeros", async () => {
    db.query.resolves(
      row(
        [...rainPeriod(), ...rainPeriod({ accumulation: 2 })],
        ["2026-07-22T12:00:00Z", "2026-07-23T12:00:00Z"],
      ),
    );

    const { periods } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(periods[0].rain).to.equal(null);
    expect(periods[1].rain.accumulation).to.equal(2);
  });

  it("returns null for a period the array never reached", async () => {
    db.query.resolves(
      row(rainPeriod({ accumulation: 2 }), [
        "2026-07-22T12:00:00Z",
        "2026-07-23T12:00:00Z",
      ]),
    );

    const { periods } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(periods[0].rain.accumulation).to.equal(2);
    expect(periods[1].rain).to.equal(null);
  });

  it("returns null for a variable with no data", async () => {
    db.query.resolves(row(null));

    const { periods } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(periods[0].rain).to.equal(null);
    expect(periods[0].snow).to.equal(null);
    expect(periods[0].freezingRain).to.equal(null);
  });

  it("converts stored percents into fractions", async () => {
    db.query.resolves(
      row(
        rainPeriod({
          probabilities: [3.6, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        }),
      ),
    );

    const { periods } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(periods[0].rain.probabilities.slice(0, 2)).to.eql([
      { atLeast: 0.01, chance: 0.04 },
      { atLeast: 0.1, chance: 1 },
    ]);
  });

  it("returns an error object when there's no match", async () => {
    db.query.resolves({ rows: [] });

    const actual = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(actual).to.eql({ error: true });
  });

  it("returns an error object if the query fails", async () => {
    db.query.rejects(new Error("boom"));

    const actual = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(actual).to.eql({ error: true });
  });
});
