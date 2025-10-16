import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("point method", () => {
  const sandbox = sinon.createSandbox();

  const openDatabase = sinon.stub();
  const db = { query: sandbox.stub() };
  openDatabase.resolves(db);

  const fetchAPIJson = sandbox.stub();

  let points;
  before(async () => {
    await quibble.esm("./db.js", {}, openDatabase);
    await quibble.esm("../util/fetch.js", { fetchAPIJson }, {});

    const module = await import("./points.js");
    points = module.default;
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(() => {
    quibble.reset();
  });

  it("passes along errors from the API, no location", async () => {
    fetchAPIJson.resolves({ error: true });
    db.query.resolves({ rows: [] });

    const actual = await points(1, 2);

    expect(actual).to.eql({
      point: { latitude: 1, longitude: 2 },
      grid: { error: true },
      isMarine: false,
      place: null,
    });
  });

  it("fetches a grid from the API, no location", async () => {
    fetchAPIJson.resolves({
      properties: { gridId: "PPU", gridX: 30, gridY: 40 },
    });
    db.query.resolves({ rows: [] });

    const actual = await points(4, 5);

    expect(actual).to.eql({
      point: { latitude: 4, longitude: 5 },
      grid: { wfo: "PPU", x: 30, y: 40 },
      isMarine: false,
      place: null,
    });
  });

  it("includes a location without a full name", async () => {
    fetchAPIJson.resolves({ error: true });

    // Marine zone query. Make this one a marine point to validate that logic.
    db.query.onCall(1).resolves({ rows: [1] });

    db.query.onCall(0).resolves({
      rows: [
        {
          name: "Townsville",
          state: "",
          stateName: "Invisibilia",
          county: "Countsylvania",
          timezone: "Imaginary",
          stateFIPS: "00",
          countyFIPS: "999",
        },
        {
          some: "other place",
        },
      ],
    });

    const actual = await points(1, 2);

    expect(actual).to.eql({
      point: { latitude: 1, longitude: 2 },
      grid: { error: true },
      isMarine: true,
      place: {
        name: "Townsville",
        state: "",
        stateName: "Invisibilia",
        county: "Countsylvania",
        timezone: "Imaginary",
        stateFIPS: "00",
        countyFIPS: "999",
      },
    });
  });

  it("includes a location with a full name", async () => {
    fetchAPIJson.resolves({ error: true });

    // Marine zone query
    db.query.onCall(1).resolves({ rows: [] });

    db.query.onCall(0).resolves({
      rows: [
        {
          name: "Townsville",
          state: "FR",
          stateName: "Franklin",
          county: "Countsylvania",
          timezone: "Imaginary",
          stateFIPS: "00",
          countyFIPS: "999",
        },
      ],
    });

    const actual = await points(1, 2);

    expect(actual).to.eql({
      point: { latitude: 1, longitude: 2 },
      grid: { error: true },
      isMarine: false,
      place: {
        name: "Townsville",
        state: "FR",
        stateName: "Franklin",
        county: "Countsylvania",
        timezone: "Imaginary",
        stateFIPS: "00",
        countyFIPS: "999",
        fullName: "Townsville, FR",
      },
    });
  });
});
