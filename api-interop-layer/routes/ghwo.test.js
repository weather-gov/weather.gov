import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: GHWO", () => {
  const sandbox = sinon.createSandbox();
  const getGHWOForWFOAndCounty = sandbox.stub();

  let ghwo;

  before(async () => {
    await quibble.esm("../data/ghwo.js", { getGHWOForWFOAndCounty });

    ghwo = await import("./ghwo.js");
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(async () => {
    await quibble.reset();
  });

  describe("exports required bits", () => {
    it("route method", () => {
      expect(ghwo.method).to.equal("GET");
    });

    it("route url", () => {
      expect(ghwo.url).to.equal("/ghwo/:wfo/:county");
    });

    it("route schema", () => {
      expect(ghwo.schema.params.wfo).to.exist;
      expect(ghwo.schema.params.county).to.exist;

      const wfoRegex = new RegExp(ghwo.schema.params.wfo.pattern);
      const countyRegex = new RegExp(ghwo.schema.params.county.pattern);

      expect(wfoRegex.test("ABC")).to.be.true;
      expect(wfoRegex.test("abc")).to.be.true;
      expect(wfoRegex.test("AB1")).to.be.false;
      expect(wfoRegex.test("AB")).to.be.false;
      expect(wfoRegex.test("ABCD")).to.be.false;

      expect(countyRegex.test("12345")).to.be.true;
      expect(countyRegex.test("123")).to.be.false;
      expect(countyRegex.test("123456")).to.be.false;
      expect(countyRegex.test("12EAS")).to.be.false;
      expect(countyRegex.test("12.45")).to.be.false;
    });

    it("route handler", () => {
      expect(ghwo.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      getGHWOForWFOAndCounty.resolves({ error: "Too dope", status: 3000 });
      const request = {
        params: { wfo: "Biggie", county: "Smalls" },
      };

      const actual = await ghwo.handler(request);

      expect(getGHWOForWFOAndCounty.calledWith("Biggie", "Smalls")).to.be.true;
      expect(actual).to.eql({
        status: 3000,
        data: { error: "Too dope" },
        error: "Too dope",
      });
    });

    it("returns GHWO data if everything is okay", async () => {
      const data = "this is some data here";
      getGHWOForWFOAndCounty.resolves({ data });
      const request = {
        params: { wfo: "Tupac", county: "Shakur" },
      };

      const actual = await ghwo.handler(request);

      expect(getGHWOForWFOAndCounty.calledWith("Tupac", "Shakur")).to.be.true;
      expect(actual).to.eql({ data });
    });
  });
});
