import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("Forecast index cache tests", () => {
  let getFromRedis,
    saveToRedis,
    requestJSON,
    processDaily,
    processGridpoint,
    processHourly,
    connectionPool,
    sandbox;

  const place = {
    timezone: "America/New_York",
  };

  const defaultResponse = [
    { error: false, data: "hello" },
    { "cache-control": "s-maxage=32" },
  ];

  let forecast;
  before(async () => {
    sandbox = sinon.createSandbox();

    getFromRedis = sandbox.stub();
    saveToRedis = sandbox.stub();
    requestJSON = sandbox.stub();
    processDaily = sandbox.stub();
    processGridpoint = sandbox.stub();
    processHourly = sandbox.stub();

    connectionPool = {
      request: sandbox.stub(),
    };

    await quibble.esm("../connectionPool.js", {}, connectionPool);
    await quibble.esm(
      "../../util/request.js",
      { requestJSONWithHeaders: requestJSON },
      {},
    );
    await quibble.esm("../../redis.js", { saveToRedis, getFromRedis }, {});
    await quibble.esm("./hourly.js", {}, processHourly);
    await quibble.esm("./daily.js", {}, processDaily);
    await quibble.esm("./gridpoint.js", {}, processGridpoint);

    const module = await import("./index.js");
    forecast = module.default;
  });

  beforeEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    requestJSON.resolves(defaultResponse);
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  describe("when fetching gridpoint data", () => {
    const args = {
      grid: {
        wfo: "TST",
        x: 34,
        y: 35,
      },
      place,
      isMarine: false,
    };

    beforeEach(() => {
      processDaily.returns({ error: true });
      processHourly.returns({ error: true });
    });

    it("attempts to retrieve gridpoint data from the cache", async () => {
      processGridpoint.returns({ message: "hello" });
      const actual = await forecast(args);

      expect(getFromRedis.calledWith(`/gridpoints/TST/34,35`)).to.equal(true);
      expect(actual.gridData).to.eql({ message: "hello" });
    });

    it("processes the cached value", async () => {
      getFromRedis.resolves({ cached: true });
      processGridpoint.returns({ message: "hello" });
      const actual = await forecast(args);

      expect(
        processGridpoint.calledWith(
          { cached: true, days: [] },
          sinon.match(sinon.match.any),
          sinon.match(sinon.match.any),
        ),
      ).to.equal(true);
      expect(actual.gridData).to.eql({ message: "hello" });
    });

    it("caches the raw response (and not the processed data)", async () => {
      processGridpoint.returns({ message: "hello" });
      await forecast(args);

      expect(
        saveToRedis.calledWith(`/gridpoints/TST/34,35`, defaultResponse[0], 32),
      ).to.equal(true);
    });

    it("does not cache if an error is thrown", async () => {
      requestJSON.throws(new Error("hi this is an error!"));
      await forecast(args);

      expect(
        saveToRedis.calledWith(
          `/gridpoints/TST/34,35`,
          sinon.match.any,
          sinon.match.any,
        ),
      ).to.equal(false);
    });
  });

  describe("when fetching daily data", () => {
    const args = {
      grid: {
        wfo: "TST",
        x: 34,
        y: 35,
      },
      place,
      isMarine: false,
    };

    beforeEach(() => {
      processGridpoint.returns({ error: true });
      processHourly.returns({ error: true });
    });

    it("attempts to retrieve daily data from the cache", async () => {
      processDaily.returns({ message: "hello" });
      const actual = await forecast(args);

      expect(
        getFromRedis.calledWith(`/gridpoints/TST/34,35/forecast`),
      ).to.equal(true);
      expect(actual.daily).to.eql({ message: "hello", days: [] });
    });

    it("returns the cached result as the daily value", async () => {
      getFromRedis.resolves({ cached: true });
      processDaily.returns({ message: "hello" });
      const actual = await forecast(args);

      expect(actual.daily).to.eql({ cached: true, days: [] });
    });

    it("caches the processed daily response", async () => {
      processDaily.returns({ message: "hello" });
      await forecast(args);

      expect(
        saveToRedis.calledWith(
          `/gridpoints/TST/34,35/forecast`,
          { message: "hello", days: [] },
          32,
        ),
      ).to.equal(true);
    });

    it("does not cache if there is an error", async () => {
      processDaily.returns({ error: true });
      await forecast(args);

      expect(
        saveToRedis.calledWith(
          `/gridpoints/TST/34,35/forecast`,
          sinon.match.any,
          sinon.match.any,
        ),
      ).to.equal(false);
    });
  });

  describe("when fetching hourly data", () => {
    const args = {
      grid: {
        wfo: "TST",
        x: 34,
        y: 35,
      },
      place,
      isMarine: false,
    };

    beforeEach(() => {
      processGridpoint.returns({ error: true });
      processDaily.returns({ error: true });
    });

    it("attempts to retrieve hourly data from the cache", async () => {
      processHourly.returns({ message: "hello" });
      await forecast(args);

      expect(
        getFromRedis.calledWith(`/gridpoints/TST/34,35/forecast/hourly`),
      ).to.equal(true);
      // Note: we don't test the result here, because hourly data is not
      // returned separately on the forecast result object.
    });

    it("caches the fetched hourly response", async () => {
      // In the case of hourly data, the hourly() processing function
      // does not return a real result. Instead it populates the in-memory
      // Map of hours that is provided to the wrapping function.
      // Maps are not serializable, and because of the time operations
      // done with hourly data, we don't want to cache it anyway.
      // So instead, it should cache the data response from the api.
      // That is what we check for here.
      processHourly.returns({ message: "you should not see this" });
      requestJSON.resolves([
        { message: "cached api response for hourly" },
        { "cache-control": "s-maxage=32" },
      ]);
      await forecast(args);

      expect(
        saveToRedis.calledWith(
          `/gridpoints/TST/34,35/forecast/hourly`,
          { message: "cached api response for hourly" },
          32,
        ),
      ).to.equal(true);
    });

    it("does not cache if there is an error", async () => {
      requestJSON.resolves({ error: true });
      await forecast(args);

      expect(
        saveToRedis.calledWith(
          `/gridpoints/TST/34,35/forecast/hourly`,
          sinon.match.any,
          sinon.match.any,
        ),
      ).to.equal(false);
    });
  });
});
