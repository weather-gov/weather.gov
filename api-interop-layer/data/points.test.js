import { expect } from "chai";
import quibble from "quibble";
import sinon from "sinon";

describe("point method", () => {
  const sandbox = sinon.createSandbox();

  const openDatabase = sinon.stub();
  const db = { query: sandbox.stub() };
  openDatabase.resolves(db);

  // Mock undici Pool instance
  const connectionPool = {
    request: sandbox.stub(),
  };

  const response = {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      text: sandbox.stub(),
      dump: sandbox.stub(),
    },
  };

  const errorResponse = {
    statusCode: 400,
    headers: { "content-type": "application/json" },
    body: {
      text: sandbox.stub().resolves(JSON.stringify({ error: "bad request" })),
      dump: sandbox.stub(),
    },
  };

  let points;
  before(async () => {
    await quibble.esm("./db.js", {}, openDatabase);
    await quibble.esm("./connectionPool.js", {}, connectionPool);

    const module = await import("./points.js");
    points = module.getPointData;
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
    connectionPool.request.resolves(response);
    response.body.dump.resolves();
    response.headers = { "content-type": "application/json" };
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  it("truncates lat/lon to 3 decimal places", async () => {
    connectionPool.request.resolves(errorResponse);
    db.query.resolves({ rows: [] });

    await points(1.1234567, 9.876543);

    const call = connectionPool.request.getCall(0);
    const requestPath = call.args[0].path;

    expect(requestPath).to.equal(`/points/1.123,9.877`);
  });

  it("passes along errors from the API, no location", async () => {
    connectionPool.request.resolves(errorResponse);
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
    connectionPool.request.resolves({
      statusCode: 404,
      headers: { "content-type": "application/json" },
      body: {
        dump: sandbox.stub().resolves(),
        text: sandbox.stub().resolves(""),
      },
    });
    db.query.resolves({ rows: [] });

    const actual = await points(1, 2);

    expect(actual).to.eql({
      point: { latitude: 1, longitude: 2 },
      grid: { error: true, outOfBounds: true, status: 404 },
      isMarine: false,
      place: null,
    });
  });

  it("throws an error if the request responded with a 403", async () => {
    connectionPool.request.resolves({
      statusCode: 403,
      headers: { "x-nothing": "read-here" },
      body: {
        dump: sandbox.stub().resolves(),
        text: sandbox.stub().resolves("")
      }
    });
    db.query.resolves({ rows: [] });

    let threwError = false;
    try {
      await points(1,2);
    } catch(e){
      if(e.cause?.statusCode === 403){
          threwError = true;
        }
    }

    expect(threwError).to.be.true;
  });

  it("returns a not-supported grid for points not *supported* by the API", async () => {
    response.body.text.resolves(
      JSON.stringify({
        properties: { gridId: null, gridX: null, gridY: null },
      }),
    );

    db.query.resolves({ rows: [] });

    const actual = await points(1, 2);

    expect(actual).to.eql({
      point: { latitude: 1, longitude: 2, astronomicalData: undefined },
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
    response.body.text.resolves(
      JSON.stringify({
        properties: {
          gridId: "PPU",
          gridX: 30,
          gridY: 40,
          geometry: undefined,
        },
      }),
    );
    db.query.resolves({ rows: [] });

    const actual = await points(4, 5);

    expect(actual).to.eql({
      point: { latitude: 4, longitude: 5, astronomicalData: undefined },
      grid: { wfo: "PPU", x: 30, y: 40, geometry: undefined },
      isMarine: false,
      place: null,
    });
  });

  it("includes astronimcal data", async () => {
    response.body.text.resolves(JSON.stringify({
      properties: {
        gridId: "PPU",
        gridX: 30,
        gridY: 40,
        geometry: undefined,
        astronomicalData: "stars and stuff",
      },
    }));
    db.query.resolves({ rows: [] });

    const actual = await points(4, 5);

    expect(actual).to.eql({
      point: { latitude: 4, longitude: 5, astronomicalData: "stars and stuff" },
      grid: { wfo: "PPU", x: 30, y: 40, geometry: undefined },
      isMarine: false,
      place: null,
    });
  });

  it("includes a location without a full name", async () => {
    connectionPool.request.resolves(errorResponse);

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
    connectionPool.request.resolves(errorResponse);

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
