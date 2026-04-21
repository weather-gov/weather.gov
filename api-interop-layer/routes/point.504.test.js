import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

class MockPool {
  constructor(...args) {
    this.args = args;
  }
}

describe("Point forecast 504 tests", () => {
  let openDatabase, db, handler, sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();

    MockPool.prototype.request = sandbox.stub();

    openDatabase = sinon.stub();
    db = {
      query: sandbox.stub(),
    };
    openDatabase.resolves(db);

    await quibble.esm("../data/db.js", {}, openDatabase);
    await quibble.esm("undici", { Pool: MockPool }, {});
    const module = await import("./point.js");
    handler = module.handler;
  });

  beforeEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();

    // Always resolve a place db lookup
    // to our constant for these tests
    db.query.onCall(0).resolves({
      rows: [{ timezone: "America/New_York" }],
    });

    db.query.onCall(1).resolves({
      rows: [
        {
          state: "NY",
          statename: "New York",
          county: "Kings",
          countyfips: "345",
          statefips: "12",
        },
      ],
    });
  });

  after(async () => {
    await quibble.reset();
    sandbox.restore();
  });

  it("catches a UND_ERR_HEADERS_TIMEOUT error and responds 504", async () => {
    const request = {
      params: {
        latitude: 0,
        longitude: 0,
      },
    };

    const timeoutError = new Error("Headers Timeout Error");
    timeoutError.code = "UND_ERR_HEADERS_TIMEOUT";

    MockPool.prototype.request.rejects(timeoutError);
    db.query.resolves({ rows: [] });

    const interopResponse = await handler(request);

    expect(interopResponse.status).to.equal(504);
    expect(interopResponse.error).to.exist;
    expect(interopResponse.error.message).to.equal(
      "API took too long to respond: UND_ERR_HEADERS_TIMEOUT",
    );
  });

  it("catches a UND_ERR_BODY_TIMEOUT error and responds 504", async () => {
    const request = {
      params: {
        latitude: 0,
        longitude: 0,
      },
    };

    const timeoutError = new Error("Body Timeout Error");
    timeoutError.code = "UND_ERR_BODY_TIMEOUT";

    MockPool.prototype.request.rejects(timeoutError);
    db.query.resolves({ rows: [] });

    const interopResponse = await handler(request);

    expect(interopResponse.status).to.equal(504);
    expect(interopResponse.error).to.exist;
    expect(interopResponse.error.message).to.equal(
      "API took too long to respond: UND_ERR_BODY_TIMEOUT",
    );
  });

  it("catches a UND_ERR_CONNECT_TIMEOUT error and responds 504", async () => {
    const request = {
      params: {
        latitude: 0,
        longitude: 0,
      },
    };

    const timeoutError = new Error("Connect Timeout Error");
    timeoutError.code = "UND_ERR_CONNECT_TIMEOUT";

    MockPool.prototype.request.rejects(timeoutError);
    db.query.resolves({ rows: [] });

    const interopResponse = await handler(request);

    expect(interopResponse.status).to.equal(504);
    expect(interopResponse.error).to.exist;
    expect(interopResponse.error.message).to.equal(
      "API took too long to respond: UND_ERR_CONNECT_TIMEOUT",
    );
  });
});
