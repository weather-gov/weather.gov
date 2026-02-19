import { expect } from "chai";
import quibble from "quibble";
import sinon from "sinon";

describe("redis utilities", () => {
  const sandbox = sinon.createSandbox();

  const redisClient = {
    json: {
      get: sandbox.stub(),
      set: sandbox.stub(),
    },
    expire: sandbox.stub(),
  };

  const createClient = sinon.stub().returns({
    on: sinon.stub().returns({ connect: sinon.stub().resolves(redisClient) }),
  });

  let redis;

  let _API_INTEROP_PRODUCTION;
  let _VCAP_SERVICES;

  before(async () => {
    _API_INTEROP_PRODUCTION = process.env.API_INTEROP_PRODUCTION;
    _VCAP_SERVICES = process.env.VCAP_SERVICES;

    // If these environment variables are missing, the redis wrapper
    // will simply not initialize and all the convenience methods
    // will quietly bail out. That is correct, but it doesn't help
    // us with testing. :P So, fake data to the rescue.
    process.env.API_INTEROP_PRODUCTION = "true";
    process.env.VCAP_SERVICES = JSON.stringify({
      "aws-elasticache-redis": [
        {
          credentials: {
            password: "Walt sent me",
            host: "Ink and Paint Club",
            port: "Red Car",
          },
        },
      ],
    });

    await quibble.esm("redis", { createClient });

    redis = await import("./redis.js");
  });

  beforeEach(() => {
    sandbox.reset();
  });

  after(() => {
    // Whatever it used to be, put it back.
    process.env.API_INTEROP_PRODUCTION = _API_INTEROP_PRODUCTION;
    process.env.VCAP_SERVICES = _VCAP_SERVICES;
  });

  it("sets up connection details from env", () => {
    const actual = redis.getRedisConnectionInfo();
    expect(actual).to.eql({
      password: "Walt sent me",
      host: "Ink and Paint Club",
      port: "Red Car",
    });
  });

  describe("parses TTL from cache headers", () => {
    it("with no headers", () => {
      const actual = redis.getTTLFromResponse({});
      expect(actual).to.equal(null);
    });

    it("with no cache-control header", () => {
      const actual = redis.getTTLFromResponse({ headers: {} });
      expect(actual).to.equal(null);
    });

    it("with no smax-age cache-control header", () => {
      const actual = redis.getTTLFromResponse({
        headers: { "cache-control": "max-age:300" },
      });
      expect(actual).to.equal(null);
    });

    it("with cache-control header and s-maxage", () => {
      const actual = redis.getTTLFromResponse({
        headers: { "cache-control": "s-maxage=300" },
      });
      expect(actual).to.equal(300);
    });
  });

  it("adds to cache", async () => {
    redisClient.json.set.resolves();
    redisClient.expire.resolves();

    await redis.saveToRedis("magic key", "my value", 40000);

    expect(redisClient.json.set.calledWith("magic key", "$", "my value")).to.be
      .true;
    expect(redisClient.expire.calledWith("magic key", 40000)).to.be.true;
  });

  it("gets from cache", async () => {
    redisClient.json.get.withArgs("magic key").resolves("magic door");
    const actual = await redis.getFromRedis("magic key");
    expect(actual).to.equal("magic door");
  });
});
