import { expect } from "chai";
import sinon from "sinon";
import quibble from "quibble";
import { parseTTLFromHeaders } from "../../redis.js";
import { DEFAULT_STATIONS_CACHE_TTL } from "./index.js";

describe("Observation fetch caching tests", () => {
  const sandbox = sinon.createSandbox();

  const getFromRedis = sandbox.stub();
  const saveToRedis = sandbox.stub();

  const connectionPool = {
    request: sandbox.stub(),
  };

  const stationsResponse = {
    statusCode: 200,
    headers: {
      "cache-control": "s-maxage=32",
      "content-type": "application/json",
    },
    body: {
      text: sandbox.stub(),
      dump: sandbox.stub().resolves(),
    },
  };

  const singleStationResponse = {
    statusCode: 200,
    headers: {
      "cache-control": "s-maxage=32",
      "content-type": "application/json",
    },
    body: {
      text: sandbox.stub(),
      dump: sandbox.stub().resolves(),
    },
  };

  let getObservations;

  before(async () => {
    await quibble.esm("../connectionPool.js", {}, connectionPool);
    await quibble.esm(
      "../../redis.js",
      { saveToRedis, getFromRedis, parseTTLFromHeaders },
      {},
    );

    const module = await import("./index.js");
    getObservations = module.default;
  });

  beforeEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    singleStationResponse.statusCode = 200;
    stationsResponse.statusCode = 200;
    // Note: we pass the globally mocked
    // database as the second param to the
    // getObservations call
    global.test.database.query.resolves({ rows: [{ distance: 100 }] });
  });

  describe("in the happy path", () => {
    // Because we are only testing the cache, let's send the same
    // response body for everything
    const responseBody = {
      features: [
        {
          properties: {
            temperature: { value: 100, unitCode: "wmoUnit:degC" },
          },
        },
      ],
    };

    const stationsResponseBody = {
      features: [
        {
          properties: {
            stationIdentifier: "station1",
            name: "Station #1",
            elevation: { unitCode: "wmoUnit:m", value: 49 },
          },
        },
        { properties: { stationIdentifier: "station2" } },
        { properties: { stationIdentifier: "station3" } },
      ],
    };

    beforeEach(() => {
      // Setup the stringified text responses for request.js
      stationsResponse.body.text.resolves(JSON.stringify(stationsResponseBody));
      singleStationResponse.body.text.resolves(JSON.stringify(responseBody));

      // Global default
      connectionPool.request.resolves(singleStationResponse);

      // Specific route for station list
      connectionPool.request
        .withArgs(sinon.match({ path: `/gridpoints/TST/2,3/stations?limit=3` }))
        .resolves(stationsResponse);

      // We need to specifically deal with all of these endpoints for every test
      // because the obs module automatically retries them if they fail. If we
      // don't make them, they'll reject. Most of the tests will still pass
      // because we're ultimately not relying on 2nd and 3rd stations, but they'll
      // possibly be slower as a result.
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/stations/station1/observations?limit=1` }),
        )
        .resolves(singleStationResponse);
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/stations/station2/observations?limit=1` }),
        )
        .resolves(singleStationResponse);
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/stations/station3/observations?limit=1` }),
        )
        .resolves(singleStationResponse);
    });

    it("caches the stations list (with the default TTL regardless of the headers)", async () => {
      await getObservations(
        {
          grid: { wfo: "TST", x: 2, y: 3 },
          point: { latitude: 22.2, longitude: 33.3 },
        },
        global.test.database,
      );

      // The request should have been made
      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/gridpoints/TST/2,3/stations?limit=3` }),
        ),
      ).to.equal(true);

      // We expect that the TTL should be the hard coded default const
      // value, regardless of what is in the response cache-control
      // header. This is because the list of stations should not change
      // often, and we are setting a longer TTL.
      //
      // Additionally, we do not check for strict match on the cached data,
      // which is an arrray. The getObservations function modifies the array
      // in place, which means by the time it gets to this assertion it
      // is a different size than the expected data.
      expect(
        saveToRedis.calledWith(
          `/gridpoints/TST/2,3/stations?limit=3`,
          sinon.match.array,
          DEFAULT_STATIONS_CACHE_TTL,
        ),
      ).to.equal(true);
    });

    it("returns a cached value for the stations list, if one is present", async () => {
      const cachedValue = [
        { properties: { stationIdentifier: "cachedStation1" } },
        { properties: { stationIdentifier: "cachedStation2" } },
      ];

      // Set up at least one of these to return good data
      connectionPool.request
        .withArgs(
          sinon.match({
            path: `/stations/cachedStation1/observations?limit=1`,
          }),
        )
        .resolves(singleStationResponse);

      // The cached endpoint that we are testing
      getFromRedis
        .withArgs(`/gridpoints/TST/2,3/stations?limit=3`)
        .resolves(cachedValue);
      await getObservations(
        {
          grid: { wfo: "TST", x: 2, y: 3 },
          point: { latitude: 22.2, longitude: 33.3 },
        },
        global.test.database,
      );

      expect(
        getFromRedis.calledWith(`/gridpoints/TST/2,3/stations?limit=3`),
      ).to.equal(true);
      // We expect that the actual request to fetch station data is _not_ called
      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/gridpoints/TST/2,3/stations?limit=3` }),
        ),
      ).to.equal(false);
      // We will know the cached value was used if we attempt to
      // fetch observations from the identifiers in the cachedValue
      // arrray
      expect(
        connectionPool.request.calledWith(
          sinon.match({
            path: `/stations/cachedStation1/observations?limit=1`,
          }),
        ),
      ).to.equal(true);
      expect(
        connectionPool.request.calledWith(
          sinon.match({
            path: `/stations/cachedStation2/observations?limit=1`,
          }),
        ),
      ).to.equal(true);
    });

    it("does not cache the stations list if the request responds with an error", async () => {
      stationsResponse.statusCode = 404;
      await getObservations(
        {
          grid: { wfo: "TST", x: 2, y: 3 },
          point: { latitude: 22.2, longitude: 33.3 },
        },
        global.test.database,
      );

      expect(
        saveToRedis.calledWith(
          `/gridpoints/TST/2,3/stations?limit=3`,
          sinon.match.array,
          DEFAULT_STATIONS_CACHE_TTL,
        ),
      ).to.equal(false);
    });

    it("caches the individual station data", async () => {
      // The first station returns good data
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/stations/station1/observations?limit=1` }),
        )
        .resolves(singleStationResponse);

      await getObservations(
        {
          grid: { wfo: "TST", x: 2, y: 3 },
          point: { latitude: 22.2, longitude: 33.3 },
        },
        global.test.database,
      );

      expect(
        saveToRedis.calledWith(
          `/stations/station1/observations?limit=1`,
          responseBody.features[0].properties,
          32,
        ),
      ).to.equal(true);
    });

    it("returns cached data for an individual station that is cached", async () => {
      const cachedData = JSON.parse(
        JSON.stringify(responseBody.features[0].properties),
      );
      cachedData.temperature.value = 22;

      getFromRedis
        .withArgs(`/stations/station1/observations?limit=1`)
        .resolves(cachedData);

      const actual = await getObservations(
        {
          grid: { wfo: "TST", x: 2, y: 3 },
          point: { latitude: 22.2, longitude: 33.3 },
        },
        global.test.database,
      );

      // The request should not have been called
      // since cached data should have been found
      expect(
        connectionPool.request.calledWith(
          sinon.match({ path: `/stations/station1/observations?limit=1` }),
        ),
      ).to.equal(false);

      // We expect the result data's temperature to
      // equal the fake number we just cached
      expect(actual.data.temperature.degC).to.equal(22);
    });

    it("does not cache the observation data if the response is an error", async () => {
      connectionPool.request
        .withArgs(
          sinon.match({ path: `/stations/station1/observations?limit=1` }),
        )
        .resolves({
          statusCode: 404,
          headers: { "content-type": "application/json" },
          body: {
            text: sandbox.stub().resolves(""),
            dump: sandbox.stub().resolves(),
          },
        });

      await getObservations(
        {
          grid: { wfo: "TST", x: 2, y: 3 },
          point: { latitude: 22.2, longitude: 33.3 },
        },
        global.test.database,
      );

      // We should never have tried to save this to
      // the cache when there's an error
      expect(
        saveToRedis.calledWith(
          `/stations/station1/observations?limit=1`,
          sinon.match.any,
          sinon.match.any,
        ),
      ).to.equal(false);
    });
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });
});
