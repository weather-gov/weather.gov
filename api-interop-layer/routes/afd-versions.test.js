import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: afd versions", () => {
  let getAFDVersions,
      versions,
      sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();
    getAFDVersions = sandbox.stub();

    await quibble.esm("../data/products/afd/versions.js", {}, getAFDVersions);

    versions = await import ("./afd-versions.js");
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(async() => {
    sandbox.restore();
    await quibble.reset();
  });

  describe("exports required bits", () => {
    it("route method", () => {
      expect(versions.method).to.equal("GET");
    });

    it("route url", () => {
      expect(versions.url).to.equal("/products/afd/versions");
    });

    it("route schema", () => {
      expect(versions.schema).to.eql({});
    });

    it("route handler", () => {
      expect(versions.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there is an error", async () => {
      getAFDVersions.resolves({
        error: "Error?",
        detail: "Not sure, maybe there was an error?",
        status: 432
      });

      const actual = await versions.handler();

      expect(getAFDVersions.calledOnce).to.be.true;
      expect(actual).to.eql({
        error: "Not sure, maybe there was an error?",
        data: {
          error: "Error?",
          detail: "Not sure, maybe there was an error?",
          status: 432
        },
        status: 432
      });
    });
  });

  it("returns afd version data if everything is ok", async () => {
    const data = "here is some afd data";
    getAFDVersions.resolves(data);

    const actual = await versions.handler();

    expect(getAFDVersions.calledOnce).to.be.true;
    expect(actual).to.eql({ data });
  });
});
