import { expect } from "chai";
import sinon from "sinon";
import quibble from "quibble";

describe("briefing module", () => {
  let response,
    getFromRedis,
    saveToRedis,
    connectionPool,
    getDataForBriefing,
    sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();
    response = {
      statusCode: 200,
      headers: {
        "cache-control": "s-maxage=42",
        "content-type": "application/json",
      },
      body: {
        text: sandbox.stub(),
        dump: sandbox.stub(),
      },
    };

    getFromRedis = sandbox.stub();
    saveToRedis = sandbox.stub();
  
    connectionPool = {
      request: sandbox.stub(),
    };
  
    await quibble.esm("./connectionPool.js", {}, connectionPool);
    await quibble.esm(
      "../redis.js",
      { getFromRedis, saveToRedis },
      {},
    );

    const module = await import("./briefing.js");
    getDataForBriefing = module.default;
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  beforeEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    response.statusCode = 200;
    response.body.dump.resolves();
    connectionPool.request.resolves(response);
    getFromRedis.resolves(null);
  });

  describe("returns data if everything goes well", () => {
    it("for one briefing", async () => {
      const mockBriefing = {
        id: "7ccab810-706b-401c-8757-71f656e56270",
        startTime: "2026-01-01T12:00:00+00:00",
        endTime: "2027-01-01T12:00:00+00:00",
        updateTime: "2026-01-10T12:00:00+00:00",
        title: "A short tab title",
        description: "A longer description of the briefing packet contents.",
        priority: false,
        officeId: "MPX",
        download:
          "http://localhost:8000/offices/MPX/briefing/download/7ccab810-706b-401c-8757-71f656e56270",
      };

      const mockData = {
        "@context": { "@version": "1.1" },
        briefing: mockBriefing,
      };

      response.body.text.resolves(JSON.stringify(mockData));

      const actual = await getDataForBriefing("ABC");

      expect(actual).to.deep.equal({
        briefing: mockData.briefing,
      });
    });
  });

  it("returns an error object if the briefing data is invalid", async () => {
    response.body.text.resolves(JSON.stringify({ briefing: null }));

    const actual = await getDataForBriefing("ABC");

    expect(actual).to.eql({ briefing: null });
  });

  it("returns an error object if the briefing fetch is unsuccessful", async () => {
    // briefing.js catch block: logs error and returns { error: true }
    response.statusCode = 500;

    const actual = await getDataForBriefing("ABC");

    expect(actual).to.eql({ error: true });
  });

  describe("cache tests", () => {
    const exampleBriefing = {
      "@context": {
        "@version": "1.1",
      },
      briefing: {
        id: "7ccab810-706b-401c-8757-71f656e56270",
        startTime: "2026-01-01T12:00:00+00:00",
        endTime: "2027-01-01T12:00:00+00:00",
        updateTime: "2026-01-10T12:00:00+00:00",
        title: "A short tab title",
        description: "A longer description of the briefing packet contents.",
        priority: false,
        officeId: "MPX",
        download:
          "http://localhost:8000/offices/MPX/briefing/download/7ccab810-706b-401c-8757-71f656e56270",
      },
    };

    it("attempts to pull a value from the cache first", async () => {
      response.body.text.resolves(JSON.stringify(exampleBriefing));

      await getDataForBriefing("ABC");

      expect(getFromRedis.calledWith(`/offices/ABC/briefing`)).to.equal(true);
    });

    it("caches the resulting value before returning it", async () => {
      response.body.text.resolves(JSON.stringify(exampleBriefing));

      await getDataForBriefing("ABC");

      expect(
        saveToRedis.calledWith(
          `/offices/ABC/briefing`,
          { briefing: exampleBriefing.briefing },
          42,
        ),
      ).to.equal(true);
    });

    it("returns the cached value when there is one", async () => {
      const cachedBriefing = { briefing: exampleBriefing.briefing };
      getFromRedis.resolves(cachedBriefing);

      const actual = await getDataForBriefing("ABC");

      // The request should never have been made
      expect(connectionPool.request.called).to.equal(false);

      // And the response should be the cached value
      expect(actual).to.eql(cachedBriefing);
    });
  });
});
