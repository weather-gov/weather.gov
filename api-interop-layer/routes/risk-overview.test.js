import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: risk overview", () => {
  const sandbox = sinon.createSandbox();
  const getRiskOverview = sandbox.stub();

  let riskOverview;

  before(async () => {
    await quibble.esm("../data/risk-overview/index.js", { getRiskOverview });

    riskOverview = await import("./risk-overview.js");
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
      expect(riskOverview.method).to.equal("GET");
    });

    it("route url", () => {
      expect(riskOverview.url).to.equal("/risk-overview/:placeId");
    });

    it("route schema", () => {
      expect(riskOverview.schema).to.eql({
        params: {
          type: "object",
          properties: {
            placeId: {
              type: "string",
              pattern: "^([0-9]{5}|[A-Za-z]{2})$",
            },
          },
        },
      });

      const idRegex = new RegExp(
        riskOverview.schema.params.properties.placeId.pattern,
      );

      expect(idRegex.test("AB")).to.be.true;
      expect(idRegex.test("ab")).to.be.true;
      expect(idRegex.test("AB1")).to.be.false;
      expect(idRegex.test("A1")).to.be.false;
      expect(idRegex.test("ABC")).to.be.false;

      expect(idRegex.test("12345")).to.be.true;
      expect(idRegex.test("123")).to.be.false;
      expect(idRegex.test("123456")).to.be.false;
      expect(idRegex.test("12EAS")).to.be.false;
      expect(idRegex.test("12.45")).to.be.false;
    });

    it("route handler", () => {
      expect(riskOverview.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      getRiskOverview.resolves({ error: "Too dope", status: 3000 });
      const request = {
        params: { placeId: "Biggie Smalls" },
      };

      const actual = await riskOverview.handler(request);

      expect(getRiskOverview.calledWith("Biggie Smalls")).to.be.true;
      expect(actual).to.eql({
        status: 3000,
        data: { error: "Too dope" },
        error: "Too dope",
      });
    });

    it("returns risk overview data if everything is okay", async () => {
      const data = "this is some data here";
      getRiskOverview.resolves(data);
      const request = {
        params: { placeId: "Tupac Shakur" },
      };

      const actual = await riskOverview.handler(request);

      expect(getRiskOverview.calledWith("Tupac Shakur")).to.be.true;
      expect(actual).to.eql({ data });
    });
  });
});
