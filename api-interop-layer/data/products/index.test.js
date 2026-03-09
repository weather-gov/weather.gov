import quibble from "quibble";
import sinon from "sinon";
import { expect } from "chai";
import { parseTTLFromHeaders } from "../../redis.js";
import AFDParser from "./afd/AFDParser.js";

class FakePool {
  constructor(...args) {
    this.args = args;
    if (FakePool.callCount) {
      FakePool.callCount += 1;
    } else {
      FakePool.callCount = 1;
    }
  }
}

describe("/product data tests", () => {
  const sandbox = sinon.createSandbox();
  const requestJSON = sandbox.stub();
  let saveToRedis = sandbox.stub();
  let getFromRedis = sandbox.stub();
  let getProduct;
  const headers = { "cache-control": "s-maxage=120" };

  before(async () => {
    // Stub out the request export so we can mock it
    await quibble.esm("undici", { Pool: FakePool }, {});
    await quibble.esm("./afd/AFDParser.js", {}, AFDParser);
    await quibble.esm("../../redis.js", {
      saveToRedis,
      getFromRedis,
      parseTTLFromHeaders,
    });
    await quibble.esm(
      "../../util/request.js",
      { requestJSONWithHeaders: requestJSON },
      {},
    );
    const imported = await import("./index.js");
    getProduct = imported.default;
    // Stub out the AFD parser
    sinon.stub(AFDParser.prototype, "parse");
    sinon.stub(AFDParser.prototype, "getStructureForTwig");
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
    requestJSON.resolves([
      {}, // the json of the response
      headers,
    ]);
  });

  after(async () => {
    AFDParser.prototype.parse.restore();
    AFDParser.prototype.getStructureForTwig.restore();
    sandbox.restore();
    await quibble.reset();
  });

  it("fetches the requested product by ID", async () => {
    await getProduct("some-id");

    const call = requestJSON.getCall(0);
    const path = call.args[1];
    expect(path).to.equal(`/products/some-id`);
  });

  it("returns the original productData object if the type is not AFD", async () => {
    const data = {
      productCode: "Something else",
      productText: "this is the text",
    };

    const expected = Object.assign({}, data);
    requestJSON.resolves([data, headers]);

    const result = await getProduct("some-id");

    expect(AFDParser.prototype.parse.callCount).to.equal(0);
    expect(AFDParser.prototype.getStructureForTwig.callCount).to.equal(0);
    expect(result).to.eql(expected);
  });

  it("attempts to parse product text when the type _is_ AFD", async () => {
    const data = {
      productCode: "AFD",
      productText: "this is the text",
    };

    requestJSON.resolves([data, headers]);

    await getProduct("some-id");

    expect(AFDParser.prototype.parse.callCount).to.equal(1);
    expect(AFDParser.prototype.getStructureForTwig.callCount).to.equal(1);
  });

  it("adds the parsed text to the output when type is AFD", async () => {
    const data = {
      productCode: "AFD",
      productText: "hello",
    };
    const expected = Object.assign({}, data, {
      parsedProductText: "parsed version!",
    });
    AFDParser.prototype.getStructureForTwig.returns("parsed version!");
    requestJSON.resolves([data, headers]);

    const result = await getProduct("some-id");

    expect(result).to.eql(expected);
  });

  it("returns the data response if there is an error during parsing", async () => {
    const error = new Error("hello");
    AFDParser.prototype.parse.throws(new Error("hello"));
    const data = {
      productCode: "AFD",
      productText: "this is the text",
    };

    requestJSON.resolves([data, headers]);

    const expected = {
      ...data,
      error: error,
      errorMessage: "hello",
    };

    const result = await getProduct("some-id");

    expect(result).to.eql(expected);
  });

  it("returns a cached object without making a request, if found", async () => {
    const data = { message: "hello" };
    getFromRedis.resolves(data);

    requestJSON.resolves([{}, headers]);

    const result = await getProduct("some-id");

    expect(requestJSON.callCount).to.equal(0);
    expect(result).to.eql(data);
  });

  it("makes a request for data and saves to cache if no cache hit found", async () => {
    const data = { message: "hello" };
    getFromRedis.resolves(false);

    requestJSON.resolves([data, headers]);

    const result = await getProduct("some-id");

    expect(
      saveToRedis.calledWith(`/products/some-id`, sinon.match.object, 120),
    ).to.equal(true);
    expect(requestJSON.callCount).to.equal(1);
    expect(result).to.eql(data);
  });
});
