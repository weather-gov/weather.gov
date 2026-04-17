import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: afd versions by wfo", () => {
  let getAFDVersionsByWFO,
      versions,
      sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();
    getAFDVersionsByWFO = sandbox.stub();

    await quibble.esm("../data/products/afd/versions.js", { byWFO: getAFDVersionsByWFO}, {});

    versions = await import ("./afd-versions-by-wfo.js");
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
      expect(versions.url).to.equal("/products/afd/versions/:wfo");
    });

    it("route schema", () => {
      expect(versions.schema).to.eql({
        params: {
          type: "object",
          properties: {
            wfo: {
              type: "string"
            }
          }
        }
      });
    });

    it("route handler", () => {
      expect(versions.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there is an error", async () => {
      getAFDVersionsByWFO.withArgs("TST").resolves({
        error: "Error?",
        detail: "Not sure, maybe there was an error?",
        status: 432
      });
      
      const request = { params: { wfo: "TST" } };

      const actual = await versions.handler(request);

      expect(getAFDVersionsByWFO.calledWith("TST")).to.be.true;
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
    getAFDVersionsByWFO.withArgs("TST").resolves(data);

    const request = { params: { wfo: "TST" } };
    const actual = await versions.handler(request);

    expect(getAFDVersionsByWFO.calledWith("TST")).to.be.true;
    expect(actual).to.eql({ data });
  });
});
