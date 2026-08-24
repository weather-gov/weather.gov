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

  it("queries by wfo, x, and y", async () => {
    db.query.resolves({ rows: [] });

    await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(db.query.calledWith(sinon.match.string, ["MPX", 30, 40])).to.be.true;
  });

  const row = (rainData) => ({
    rows: [
      {
        rain_data: rainData,
        snow_data: null,
        freezing_rain_data: null,
        cycle: new Date("2026-07-21T12:00:00Z"),
        valid_time: new Date("2026-07-22T12:00:00Z"),
      },
    ],
  });

  it("reports the accumulation period ending at the valid time", async () => {
    db.query.resolves(row(null));

    const actual = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(actual.cycle).to.eql(new Date("2026-07-21T12:00:00Z"));
    expect(actual.period).to.eql({
      start: new Date("2026-07-21T12:00:00Z"),
      end: new Date("2026-07-22T12:00:00Z"),
      hours: 24,
    });
  });

  it("brackets low and high off the percentiles and takes expected from the accumulation", async () => {
    db.query.resolves(
      row({
        accumulation: 0.6799212694168091,
        percentiles: {
          10: 0.31799212098121643,
          50: 0.9550787806510925,
          90: 1.9838975667953491,
        },
      }),
    );

    const { rain } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(rain.accumulation).to.equal(0.68);
    expect(rain.range).to.eql({
      low: { amount: 0.32, chance: 0.9 },
      expected: { amount: 0.68, chance: 0.5 },
      high: { amount: 1.98, chance: 0.1 },
    });
  });

  it("sorts percentiles and thresholds numerically, not as strings", async () => {
    db.query.resolves(
      row({
        accumulation: 0,
        percentiles: { 50: 0.5, 5: 0.05, 10: 0.1 },
        probabilities: { "1.00": 48.2, "12.0": 0, "2.00": 9 },
      }),
    );

    const { rain } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(rain.percentiles).to.eql([
      { percentile: 5, amount: 0.05 },
      { percentile: 10, amount: 0.1 },
      { percentile: 50, amount: 0.5 },
    ]);
    expect(rain.probabilities).to.eql([
      { atLeast: 1, chance: 0.48 },
      { atLeast: 2, chance: 0.09 },
      { atLeast: 12, chance: 0 },
    ]);
  });

  it("converts stored percents into fractions", async () => {
    db.query.resolves(row({ probabilities: { 0.01: 3.6, "0.10": 100 } }));

    const { rain } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(rain.probabilities).to.eql([
      { atLeast: 0.01, chance: 0.04 },
      { atLeast: 0.1, chance: 1 },
    ]);
  });

  it("returns null for a variable that decoded to all zeros", async () => {
    db.query.resolves(
      row({
        accumulation: 0,
        percentiles: { 10: 0, 50: 0, 90: 0 },
        probabilities: { "0.10": 0, "1.00": 0 },
      }),
    );

    const { rain } = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(rain).to.equal(null);
  });

  it("returns null for a variable with no data", async () => {
    db.query.resolves(row(null));

    const actual = await getWpcProbPrecip({ wfo: "MPX", x: 30, y: 40 });

    expect(actual.rain).to.equal(null);
    expect(actual.snow).to.equal(null);
    expect(actual.freezingRain).to.equal(null);
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
