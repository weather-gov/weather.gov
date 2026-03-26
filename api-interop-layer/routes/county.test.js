import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: county data", () => {
  let getCountyData,
    county,
    sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();
    getCountyData = sandbox.stub();
    await quibble.esm("../data/county/index.js", { getCountyData });

    county = await import("./county.js");
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  describe("exports required bits", () => {
    it("route method", () => {
      expect(county.method).to.equal("GET");
    });

    it("route url", () => {
      expect(county.url).to.equal("/county/:fips");
    });

    it("route schema", () => {
      expect(county.schema.params.properties.fips).to.exist;

      const fipsRegex = new RegExp(
        county.schema.params.properties.fips.pattern,
      );

      expect(fipsRegex.test("12345")).to.be.true;
      expect(fipsRegex.test("01234")).to.be.true;
      expect(fipsRegex.test("123")).to.be.false;
      expect(fipsRegex.test("123456")).to.be.false;
      expect(fipsRegex.test("12EAS")).to.be.false;
      expect(fipsRegex.test("12.45")).to.be.false;
    });

    it("route handler", () => {
      expect(county.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      getCountyData.resolves({ error: "Oh noes!", status: 3000 });
      const request = {
        params: { fips: "38582" },
      };

      const actual = await county.handler(request);

      expect(getCountyData.calledWith("38582")).to.be.true;
      expect(actual).to.eql({
        status: 3000,
        data: { error: "Oh noes!" },
        error: "Oh noes!",
      });
    });

    it("returns county data if everything is okay", async () => {
      const data = "this is some data here";
      getCountyData.resolves(data);
      const request = {
        params: { fips: "19959" },
      };

      const actual = await county.handler(request);

      expect(getCountyData.calledWith("19959")).to.be.true;
      expect(actual).to.eql({ data });
    });
  });
});
