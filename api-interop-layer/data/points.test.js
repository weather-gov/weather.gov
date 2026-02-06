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
    points = module.getPointData;
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

  it("returns an out-of-bounds grid for points not covered by the API", async () => {
    fetchAPIJson.resolves({ error: true, status: 404 });
    db.query.resolves({ rows: [] });

    const actual = await points(1, 2);

    expect(actual).to.eql({
      point: { latitude: 1, longitude: 2 },
      grid: { error: true, outOfBounds: true, status: 404 },
      isMarine: false,
      place: null,
    });
  });

  it("returns a not-supported grid for points not *supported* by the API", async () => {
    fetchAPIJson.resolves({
      properties: { gridId: null, gridX: null, gridY: null },
    });
    db.query.resolves({ rows: [] });

    const actual = await points(1, 2);

    expect(actual).to.eql({
      point: { latitude: 1, longitude: 2 },
      grid: {
        error: true,
        notSupported: true,
        wfo: null,
        x: null,
        y: null,
        geometry: undefined,
      },
      isMarine: false,
      place: null,
    });
  });

  it("fetches a grid from the API, no location", async () => {
    fetchAPIJson.resolves({
      properties: { gridId: "PPU", gridX: 30, gridY: 40, geometry: undefined },
    });
    db.query.resolves({ rows: [] });

    const actual = await points(4, 5);

    expect(actual).to.eql({
      point: { latitude: 4, longitude: 5 },
      grid: { wfo: "PPU", x: 30, y: 40, geometry: undefined },
      isMarine: false,
      place: null,
    });
  });

  it("includes a location without a full name", async () => {
    fetchAPIJson.resolves({ error: true });

    // Marine zone query. Make this one a marine point to validate that logic.
    db.query
      .withArgs(sinon.match(/FROM weathergov_geo_zones/i))
      .resolves({ rows: [1] });

    db.query.withArgs(sinon.match(/FROM weathergov_geo_places/i)).resolves({
      rows: [
        {
          name: "Townsville",
          timezone: "Imaginary",
        },
        {
          some: "other place",
        },
      ],
    });

    db.query.withArgs(sinon.match(/FROM weathergov_geo_counties/i)).resolves({
      rows: [
        {
          state: "",
          name: "Visibilia",
          countyname: "Parishville",
          countyfips: "000",
          fips: "99",
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
        statename: "Visibilia",
        county: "Parishville",
        timezone: "Imaginary",
        statefips: "99",
        countyfips: "000",
      },
    });
  });

  it("includes a location with a full name", async () => {
    fetchAPIJson.resolves({ error: true });

    // Marine zone query
    db.query
      .withArgs(sinon.match(/FROM weathergov_geo_zones/i))
      .resolves({ rows: [] });

    db.query.withArgs(sinon.match(/FROM weathergov_geo_places/i)).resolves({
      rows: [
        {
          name: "Townsville",
          timezone: "Imaginary",
        },
      ],
    });

    db.query.withArgs(sinon.match(/FROM weathergov_geo_counties/i)).resolves({
      rows: [
        {
          state: "OT",
          name: "Overthere",
          countyname: "Countbackwardsylvania",
          countyfips: "444",
          fips: "55",
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
        state: "OT",
        statename: "Overthere",
        county: "Countbackwardsylvania",
        timezone: "Imaginary",
        statefips: "55",
        countyfips: "444",
        fullName: "Townsville, OT",
      },
    });
  });
});
