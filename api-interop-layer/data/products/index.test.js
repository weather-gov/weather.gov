import sinon from "sinon";
import { expect } from "chai";
import { BASE_URL } from "../../util/fetch.js";
import AFDParser from "./afd/AFDParser.js";
import getProduct from "./index.js";

describe("product module index", () => {
  const sandbox = sinon.createSandbox();
  const response = { status: 200, json: sandbox.stub() };
  const wait = sandbox.stub();

  let afdParser_parse;
  let afdParser_getStructureForTwig;

  before(async () => {
    afdParser_parse = sandbox.stub(AFDParser.prototype, "parse");
    afdParser_getStructureForTwig = sandbox.stub(
      AFDParser.prototype,
      "getStructureForTwig",
    );
  });

  beforeEach(() => {
    response.status = 200;
    sandbox.resetBehavior();
    sandbox.resetHistory();
    wait.resolves();
    fetch.resolves(response);
  });

  after(() => {
    afdParser_parse.restore();
    afdParser_getStructureForTwig.restore();
    sandbox.restore();
  });

  it("fetches the requested product by ID", async () => {
    response.json.resolves("success");

    const result = await getProduct("and now, the weather");

    expect(result).to.equal("success");
    expect(
      fetch.calledWith(`${BASE_URL}/products/and%20now,%20the%20weather`),
    ).to.equal(true);
  });

  it("returns the API response if status is not 200", async () => {
    response.status = 400;
    response.json.resolves({ message: "oh noes" });

    const result = await getProduct("err");
    expect(result).to.eql({ message: "oh noes", status: 400, error: true });
  });

  it("returns the API response if product type is not AFD", async () => {
    response.json.resolves({
      productCode: "ABC",
      message: "Bob Barker hates pets",
    });

    const result = await getProduct("id");
    expect(result).to.eql({
      productCode: "ABC",
      message: "Bob Barker hates pets",
    });
  });

  it("returns the API response if there is an error parsing", async () => {
    response.json.resolves({
      productCode: "AFD",
      message: "Oh no things will fail!",
    });
    afdParser_parse.throws("oh no");

    const result = await getProduct("id");
    expect(result).to.eql({
      productCode: "AFD",
      message: "Oh no things will fail!",
    });
  });

  it("parses the AFD if a successful fetch", async () => {
    response.json.resolves({ productCode: "AFD", productText: "howdy doody" });

    afdParser_getStructureForTwig.returns("teehee");

    const result = await getProduct("id");

    expect(result).to.eql({
      productCode: "AFD",
      productText: "howdy doody",
      parsedProductText: "teehee",
    });
  });
});
