import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("Point forecast route  403 to 429 tests", () => {
  const sandbox = sinon.createSandbox();

  class MockPool {
    constructor(...args){
      this.args = args;
    }
  }
  MockPool.prototype.request = sandbox.stub();

  const openDatabase = sinon.stub();
  const db = {
    query: sandbox.stub()
  };
  openDatabase.resolves(db);

  const apiResponse = {
    statusCode: 200,
    body: {
      text: sinon.stub().resolves("hi"),
      dump: sinon.stub().resolves(
        sinon.stub().resolves()
      )
    }
  };

  let handler;
  let worker;
  before(async() => {
    await quibble.esm("../data/db.js", {}, openDatabase);
    await quibble.esm("undici", { Pool: MockPool }, {});
    const module = await import("./point.js");
    handler = module.handler;
    const indexModule = await import("../data/index.js");
    worker = indexModule.backgroundWorker;
  });

  beforeEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    apiResponse.statusCode = 200;
    MockPool.prototype.request.resolves(apiResponse);

    // Always resolve a place db lookup
    // to our constant for these tests
    db.query.onCall(0).resolves({
      rows: [
        { timezone: "America/New_York"}
      ]
    });

    db.query.onCall(1).resolves({
      rows: [
        {
          state: "NY",
          statename: "New York",
          county: "Kings",
          countyfips: "345",
          statefips: "12"
        }
      ]
    });
  });

  after(async () => {
    await quibble.reset();
    sandbox.restore();
    await worker.terminate();
  });

  it("catches a thrown 403 error and responds 429", async () => {
    const request = {
      params: {
        latitude: 0,
        longitude: 0
      }
    };
    apiResponse.statusCode = 403;
    db.query.resolves({ rows: []});
    const interopResponse = await handler(request);

    expect(interopResponse.status).to.equal(429);
  });

  it("handles a 500 error as an error dictionary (no thrown Error)", async () => {
    const request = {
      params: {
        latitude: 0,
        longitude: 0
      }
    };
    db.query.resolves({ rows: []});
    apiResponse.statusCode = 500;
    const interopResponse = await handler(request);

    expect(interopResponse.data.forecast).to.eql({error: true});
    expect(interopResponse.data.grid).to.eql({error: true});
  });
});
