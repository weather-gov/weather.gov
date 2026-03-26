import { expect } from "chai";
import quibble from "quibble";
import sinon from "sinon";

describe("route: briefings", () => {
  let getDataForBriefing,
    briefing,
    sandbox;
  
  before(async () => {
    sandbox = sinon.createSandbox();
    getDataForBriefing = sandbox.stub();
  
    await quibble.esm("../data/briefing.js", {}, getDataForBriefing);

    briefing = await import("./briefing.js");
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
      expect(briefing.method).to.equal("GET");
    });

    it("route url", () => {
      expect(briefing.url).to.equal("/offices/:wfo/briefing");
    });

    it("route schema", () => {
      expect(briefing.schema).to.eql({
        params: {
          type: "object",
          properties: {
            wfo: {
              type: "string",
              pattern: "^[A-Z]{3}$",
            },
          },
        },
      });

      const idRegex = new RegExp(briefing.schema.params.properties.wfo.pattern);

      expect(idRegex.test("ABC")).to.be.true;
      expect(idRegex.test("XYZ")).to.be.true;

      expect(idRegex.test("AB1")).to.be.false;
      expect(idRegex.test("abc")).to.be.false;
      expect(idRegex.test("xyz")).to.be.false;
      expect(idRegex.test("ABCD")).to.be.false;
      expect(idRegex.test("WXYZ")).to.be.false;
      expect(idRegex.test("12ABC")).to.be.false;
      expect(idRegex.test("AB.C")).to.be.false;
    });

    it("route handler", () => {
      expect(briefing.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      getDataForBriefing.resolves({ error: "Too dope", status: 3000 });
      const request = {
        params: { wfo: "Biggie Smalls" },
      };

      const actual = await briefing.handler(request);

      expect(getDataForBriefing.calledWith("Biggie Smalls")).to.be.true;
      expect(actual).to.eql({
        status: 3000,
        data: { error: "Too dope", status: 3000 },
        error: "Too dope",
      });
    });

    it("returns briefing data if everything is okay", async () => {
      const data = "this is some data here";
      getDataForBriefing.resolves(data);
      const request = {
        params: { wfo: "Tupac Shakur" },
      };

      const actual = await briefing.handler(request);

      expect(getDataForBriefing.calledWith("Tupac Shakur")).to.be.true;
      expect(actual).to.eql({ data });
    });
  });
});
